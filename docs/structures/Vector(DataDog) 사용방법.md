## 질문
ClickHouse에 바로 넣지 않고, RedPanda로 넣고 GoLang에서 ClickHouse로 넣는 로직으로 다시 알려줘. 예제 소스도 같이 알려주면 좋을 것 같아.

---

아키텍처가 아주 훌륭하게 진화하고 있네요. 대규모 트래픽이 발생하는 차세대 TMS에서 Redpanda(Kafka 호환 고성능 메시지 큐)를 완충 지대(Buffer)로 두고, GoLang 수집기(Consumer)가 이를 가져와 가공(GeoIP, 자산 매핑)한 뒤 **ClickHouse에 벌크(Bulk)로 적재**하는 구조는 현재 보안 업계에서 가장 대량의 로그를 안정적으로 처리할 수 있는 '끝판왕 아키텍처'입니다.

이 구조는 실시간으로 로그가 아무리 폭발해도 Redpanda가 중간에서 다 받아주기 때문에 ClickHouse나 백엔드가 절대 죽지 않는다는 강력한 장점이 있습니다.

전체 데이터 흐름과 GoLang 파이프라인의 핵심 구현 코드를 상세히 안내해 드립니다.

---

## 1. 전체 데이터 파이프라인 구조

1. **Vector (Collector):** 보안 장비 로그를 수집하여 **Redpanda**의 `security-raw-logs` 토픽으로 날것 그대로 쏩니다. (가벼운 파싱만 수행)
2. **Redpanda (Message Queue):** 초당 수십만 건의 로그를 디스크에 안정적으로 순서대로 저장하며 버퍼링합니다.
3. **GoLang 수집기 (Consumer & Enricher):**
* Redpanda에서 로그를 컨슘합니다.
* **메모리에 로드된 MaxMind DB로 국가 코드를 초고속 매칭**합니다.
* **메모리에 로드된 CIDR 테이블로 내부 자산(Zone)을 초고속 매칭**합니다.
* 채워진 로그들을 채널(Channel)이나 슬라이스에 모았다가 **ClickHouse로 한번에 벌크 Insert** 합니다.


4. **ClickHouse (Storage):** 가공이 완료된 대용량 로그를 압축하여 초고속 저장합니다.

---

## 2. GoLang 컨슈머 & 인리치먼트 예제 소스 코드

이 코드는 Redpanda에서 로그를 읽어와 **GeoIP 변환, CIDR 자산 매핑**을 수행한 뒤 ClickHouse에 **1,000건 단위 또는 1초 주기로 벌크 저장**하는 상용 수준의 아키텍처 패턴을 단순화한 예제입니다.

### 의존성 설치

```bash
go get github.com/twmb/franz-go # 최신 고성능 Kafka/Redpanda 라이브러리
go get github.com/ClickHouse/clickhouse-go/v2 # ClickHouse 공식 드라이버
go get github.com/oschwald/geoip2-golang # GeoIP 라이브러리

```

### `main.go`

```go
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/oschwald/geoip2-golang"
	"github.com/twmb/franz-go/pkg/kgo"
)

// 1. 로그 구조체 정의
type RawLog struct {
	SrcIP     string `json:"src_ip"`
	DstIP     string `json:"dst_ip"`
	Signature string `json:"signature"`
}

type EnrichedLog struct {
	Time       time.Time
	SrcIP      string
	DstIP      string
	Signature  string
	SrcCountry string
	DstZone    string
	Severity   string
}

// 2. 자산 대역 매핑을 위한 구조체
type AssetZone struct {
	CIDR     *net.IPNet
	ZoneName string
	Severity string
}

var assetZones []AssetZone
var geoipDB *geoip2.Reader

func initAssetAndGeoIP() {
	// GeoIP DB 로드 (메모리 매핑)
	var err error
	geoipDB, err = geoip2.Open("/etc/vector/GeoLite2-Country.mmdb")
	if err != nil {
		log.Fatalf("GeoIP DB 로드 실패: %v", err)
	}

	// 자산 대역 하드코딩 예시 (실무에선 DB나 파일에서 로드하여 메모리에 적재)
	zones := map[string][]string{
		"ZONE_DMZ_WEB":    {"10.10.10.0/24", "High"},
		"ZONE_DMZ_WAS":    {"10.10.20.0/24", "High"},
		"ZONE_INTERNAL_DB": {"10.20.10.0/24", "Critical"},
	}

	for zoneName, info := range zones {
		_, cidr, _ := net.ParseCIDR(info[0])
		assetZones = append(assetZones, AssetZone{CIDR: cidr, ZoneName: zoneName, Severity: info[1]})
	}
}

// 3. 초고속 인리치먼트 로직 (메모리 연산)
func enrich(raw RawLog) EnrichedLog {
	enriched := EnrichedLog{
		Time:       time.Now(),
		SrcIP:      raw.SrcIP,
		DstIP:      raw.DstIP,
		Signature:  raw.Signature,
		SrcCountry: "UNKNOWN",
		DstZone:    "ZONE_UNKNOWN",
		Severity:   "Medium",
	}

	// 국가 코드 매칭
	ip := net.ParseIP(raw.SrcIP)
	if record, err := geoipDB.Country(ip); err == nil {
		if record.Country.IsoCode != "" {
			enriched.SrcCountry = record.Country.IsoCode
		}
	}

	// 자산 대역 매칭
	dstIP := net.ParseIP(raw.DstIP)
	for _, zone := range assetZones {
		if zone.CIDR.Contains(dstIP) {
			enriched.DstZone = zone.ZoneName
			enriched.Severity = zone.Severity
			break
		}
	}

	return enriched
}

func main() {
	initAssetAndGeoIP()
	defer geoipDB.Close()

	// 4. ClickHouse 연결 설정
	chConn := clickhouse.OpenDB(&clickhouse.Options{
		Addr: []string{"127.0.0.1:9000"},
		Auth: clickhouse.Auth{
			Database: "tms_security",
			Username: "default",
			Password: "",
		},
	})
	defer chConn.Close()

	// 5. Redpanda(Kafka) 클라이언트 설정
	brokers := []string{"127.0.0.1:9092"}
	cl, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.ConsumerGroup("tms-processor-group"),
		kgo.ConsumeTopics("security-raw-logs"),
	)
	if err != nil {
		log.Fatalf("Redpanda 연결 실패: %v", err)
	}
	defer cl.Close()

	log.Println("TMS GoLang 수집기 가동 시작...")

	// 벌크 처리를 위한 버퍼 설정
	batchSize := 1000
	buffer := make([]EnrichedLog, 0, batchSize)
	ticker := time.NewTicker(1 * time.Second) // 1초 주기로 무조건 Flush

	ctx := context.Background()

	for {
		select {
		case <-ticker.C:
			if len(buffer) > 0 {
				flushToClickHouse(ctx, chConn, buffer)
				buffer = buffer[:0] // 버퍼 초기화
			}
		default:
			// Redpanda에서 로그 폴링 (Non-blocking 느낌으로 처리하기 위해 주기 조절 가능)
			fetches := cl.PollRecords(ctx, 100)
			if fetches.Err() != nil {
				log.Printf("Redpanda 읽기 오류: %v", fetches.Err())
				continue
			}

			iter := fetches.RecordIter()
			for !iter.Done() {
				record := iter.Next()
				
				var raw RawLog
				if err := json.Unmarshal(record.Value, &raw); err != nil {
					continue
				}

				// 인리치먼트 수행 (GeoIP + 자산 매핑)
				enriched := enrich(raw)
				buffer = append(buffer, enriched)

				// 1,000건이 쌓이면 벌크 적재
				if len(buffer) >= batchSize {
					flushToClickHouse(ctx, chConn, buffer)
					buffer = buffer[:0]
				}
			}
		}
	}
}

// 6. ClickHouse 벌크 적재 함수
func flushToClickHouse(ctx context.Context, db *sql.DB, batch []EnrichedLog) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("ClickHouse 트랜잭션 시작 실패: %v", err)
		return
	}

	stmt, err := tx.PrepareContext(ctx, "INSERT INTO ips_enriched_logs (log_time, src_ip, dst_ip, signature, src_country, dst_zone, severity)")
	if err != nil {
		log.Printf("ClickHouse Prepare 실패: %v", err)
		return
	}
	defer stmt.Close()

	for _, logData := range batch {
		_, err = stmt.ExecContext(ctx,
			logData.Time,
			logData.SrcIP,
			logData.DstIP,
			logData.Signature,
			logData.SrcCountry,
			logData.DstZone,
			logData.Severity,
		)
		if err != nil {
			log.Printf("데이터 바인딩 실패: %v", err)
			continue
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("ClickHouse 벌크 커밋 실패: %v", err)
	} else {
		fmt.Printf("[%s] ClickHouse 벌크 적재 완료: %d 건\n", time.Now().Format("15:04:05"), len(batch))
	}
}

```

---

## 3. 이 아키텍처가 정답인 이유 (성능적 관점)

1. **GoLang의 고성능 멀티스레딩(Goroutine):** 위 예제는 단일 스레드 루프 형태이지만, 트래픽이 더 늘어나면 Redpanda 컨슘 파트와 ClickHouse 적재 파트를 고루틴(Goroutine)과 채널(Channel)로 분리하여 완벽한 비동기 병렬 처리가 가능합니다. CPU 코어를 최대치로 쓸 수 있습니다.
2. **ClickHouse가 가장 좋아하는 '벌크(Bulk)' 패턴:** ClickHouse는 1건씩 Insert 하면 시스템이 금방 뻗어버립니다. 위 코드처럼 `1,000건 단위` 혹은 `1초 타이머` 듀얼 트리거를 이용해 **묶어서 한 번에 무겁게 던지는 방식**이 ClickHouse 가이드라인의 정석입니다.
3. **메모리 기반 고속 룩업:** `geoipDB.Country()`와 `zone.CIDR.Contains()` 모두 디스크나 외부 DB를 찌르지 않고 **오직 GoLang 프로세스의 RAM 메모리 안에서 연산**하므로, 로그 1건당 가공 속도가 수 마이크로초(µs) 수준에 불과합니다.

이렇게 파이프라인을 다져 놓으면, 앞서 고민하셨던 **React 토폴로지 화면**이나 VectorDB(유사도 추천 엔진)로 넘겨줄 핵심 정제 데이터(`src_country`, `dst_zone`)가 ClickHouse에 그 어떤 병목도 없이 실시간으로 쾌적하게 쌓이게 됩니다. 최고의 아키텍처 선택이십니다!

---

## 질문
Vector YAML 설정 부분이 빠진 것 같은데 ClickHouse가 아니라 RedPanda로 보내는 설정이 필요하지 않나?

---

아, 제가 아키텍처 흐름을 GoLang 중심으로 설명해 드리면서 Vector의 설정을 빠트렸네요. 날카로운 지적 감사드립니다.

말씀하신 대로, 이 아키텍처가 완성되려면 **Vector가 로그를 수집해서 ClickHouse가 아닌 Redpanda(Kafka 토픽)로 가볍게 밀어 넣어주는 YAML 설정**이 반드시 필요합니다.

이 단계에서 Vector는 복잡한 가공(GeoIP, 자산 매핑)을 하지 않고, 원본 로그를 JSON 형태로 변환하여 Redpanda로 초고속 전송하는 역할만 수행합니다.

실무용 Vector YAML 설정 예시와 함께, GoLang 코드와 맞물리는 데이터 스키마 규칙을 안내해 드립니다.

---

### 1. Vector YAML 설정 예시 (`vector.yaml`)

Vector에서 Redpanda는 Kafka와 100% API 호환이 되기 때문에 `kafka` 싱크(Sink) 타입을 사용해 간단하게 전송할 수 있습니다.

```yaml
# ==========================================
# 1. SOURCES : 로그 수집 레이어
# ==========================================
sources:
  ips_logs_raw:
    type: "file" # 예시: IPS 장비 로그 파일 수집 (Syslog 등으로 변경 가능)
    include:
      - "/var/log/ips/*.log"

# ==========================================
# 2. TRANSFORMS : 가벼운 포맷팅 (텍스트 -> JSON)
# ==========================================
transforms:
  format_to_json:
    type: "remap"
    inputs:
      - "ips_logs_raw"
    source: |
      # 1. 원본 로그 메시지가 쉼표나 특정 규칙으로 되어 있다면 파싱합니다.
      # 여기서는 원본이 이미 JSON이거나, 예시를 위해 구조화하는 단계입니다.
      # 백엔드 GoLang 수집기가 읽기 편하도록 표준 JSON 형태로 매핑합니다.
      
      # 예시: 원본 텍스트 내용을 분리하여 객체화 (정규식이나 파서 활용 가능)
      # 실무에서는 장비 로그 포맷에 맞게 .src_ip, .dst_ip, .signature를 추출합니다.
      . = parse_json(.message) ?? {
        "src_ip": "211.234.5.6",       # 테스트용 예시 데이터 구조
        "dst_ip": "10.10.20.15",
        "signature": "Apache_Tomcat_Exploit_Attempt"
      }

# ==========================================
# 3. SINKS : 버퍼 레이어 전송 (Redpanda / Kafka 토픽)
# ==========================================
sinks:
  redpanda_buffer:
    type: "kafka" # Redpanda는 Kafka 프로토콜을 그대로 사용합니다.
    inputs:
      - "format_to_json"
    bootstrap_servers: "127.0.0.1:9092" # Redpanda 브로커 주소
    topic: "security-raw-logs"          # GoLang 수집기가 바라볼 토픽명
    compression: "gzip"                 # 대량 로그 전송 시 대역폭 절약을 위한 압축
    encoding:
      codec: "json"                     # Redpanda에 JSON 문자열 형태로 저장

```

---

### 2. 아키텍처 정렬 점검 (Vector ──> GoLang)

이 설정을 적용하면 전체 데이터 스키마 흐름이 아래와 같이 딱 맞아떨어집니다.

1. **Vector**가 로그를 읽어 `{ "src_ip": "...", "dst_ip": "...", "signature": "..." }` 형태의 가벼운 JSON으로 만들어 Redpanda의 `security-raw-logs` 토픽에 적재합니다.
2. 앞서 작성한 **GoLang 컨슈머 코드**의 `RawLog` 구조체가 이 JSON을 그대로 언마샬링(`json.Unmarshal`)하여 수신합니다.
```go
type RawLog struct {
    SrcIP     string `json:"src_ip"`
    DstIP     string `json:"dst_ip"`
    Signature string `json:"signature"`
}

```


3. **GoLang**이 메모리 상에서 국가코드와 자산 ID를 초고속으로 이어 붙인 후(Enrichment), **ClickHouse**가 가장 효율적으로 처리할 수 있는 벌크 쿼리(`INSERT INTO ...`)로 변환해 집어넣습니다.

이렇게 Vector(수집 및 JSON화) ──> Redpanda(안정적 큐잉) ──> GoLang(메모리 기반 고속 인리치먼트 및 벌크) ──> ClickHouse(최종 저장) 파이프라인이 완벽하게 연결됩니다. 이 구조라면 대규모 관제 환경에서도 유실 없이 실시간 데이터를 토폴로지 화면까지 쾌적하게 전달할 수 있습니다.

---

## 질문
RedPanda로 보낼 때는 복잡한 가공(GeoIP,  자산 매핑)은 왜 안하는거야? GoLang에서 하는거야 그럼?

---

아주 핵심적인 파이프라인 설계 원칙에 대한 질문입니다. 결론부터 말씀드리면, **네, 맞습니다. Vector에서는 단순 파싱만 하고, 국가 코드(GeoIP)나 자산 매핑 같은 '무거운 연산'은 큐(Redpanda) 뒤에 있는 GoLang에서 전담하는 것이 아키텍처 정석입니다.**

이렇게 단계를 철저히 나누는 이유는 **"수집기의 생존(안정성)"**, **"데이터의 무결성(유실 방지)"**, 그리고 **"유지보수의 편의성"** 때문입니다. 왜 그래야 하는지 3가지 결정적인 이유를 설명해 드릴게요.

---

## 1. 수집기(Vector)는 무조건 가볍고 빨라야 한다 (병목 방지)

보안 장비(IPS, FW 등) 바로 옆이나 로그가 집중되는 게이트웨이 서버에 설치되는 Vector는 "로그가 발생하는 속도보다 더 빠르게 긁어서 안전한 곳(Redpanda)으로 대피시키는 것"이 최우선 임무입니다.

* **Vector에서 무거운 연산을 할 경우:** 만약 로그 한 건마다 GeoIP 파일을 디스크/메모리에서 읽고, 수많은 자산 CIDR 조건문을 돌리느라 CPU를 쓰게 되면, 초당 수십만 건씩 쏟아지는 로그 수집 속도를 Vector가 따라가지 못합니다.
* **결과:** Vector의 버퍼가 가득 차고, 결국 보안 장비의 로그가 유실되거나 장비 자체에 부하(장비 디스크 풀 등)를 주게 됩니다.

따라서 Vector는 로그를 받자마자 "단순히 JSON 형태로만 예쁘게 포장해서 초고속으로 Redpanda에 집어던지는 일"만 해야 안전합니다.

---

## 2. Redpanda(큐)를 버퍼로 두고 후선 처리(GoLang)해야 유실이 없다

네트워크 단절이나 자산 DB 업데이트 오류 등, 시스템에는 언제든 문제가 생길 수 있습니다.

* **Vector에서 가공하다가 에러가 나면:** 가공 엔진(Vector)이 멈춰 서고 그 동안 들어오는 실시간 로그는 모두 공중 분해(유실)됩니다.
* **Redpanda 뒤의 GoLang에서 가공하면:** 만약 GoLang 소스 코드에 버그가 있거나, GeoIP 파일이 깨져서 GoLang 프로세스가 뻗더라도 **원본 로그는 이미 Redpanda(디스크)에 안전하게 누적**되고 있습니다.
* 관제 장비나 Vector는 아무런 타격 없이 로그를 계속 Redpanda로 밀어 넣으면 되고, 개발자는 낮이든 밤이든 고치고 싶을 때 GoLang 코드를 수정해서 다시 켜기만 하면 됩니다. 그러면 GoLang이 Redpanda에 쌓여있던 로그를 처음부터 다시 컨슘하여 **유실 없이(Zero-loss)** 가공을 재개합니다.

---

## 3. 사내 자산 정보(Asset DB) 동기화 및 관리의 한계

사내 자산 정보(IP 대역)는 고정된 것이 아니라, 새로운 서버가 추가되거나 부서가 바뀔 때마다 **실시간으로 변경**됩니다.

* **Vector(YAML)에서 매칭할 경우:** 자산 대역이 바뀔 때마다 수십 대의 Vector 서버에 있는 `vector.yaml` 파일을 일일이 수정하고 재시작(Reload)해야 합니다. 관리가 지옥이 됩니다.
* **GoLang에서 매칭할 경우:** GoLang은 프로그램입니다. 코드 내부에 `Timer`를 두어 1분마다 사내 자산 관리 RDBMS(또는 Redis)를 찔러서 최신 IP 대역 리스트를 메모리에 자동으로 갱신(Sync)하도록 짤 수 있습니다.

즉, Vector는 자산이 바뀌든 말든 신경 쓰지 않고 로그만 나르고, **"최신 자산 정보를 아는 스마트한 역할"은 GoLang이 전담**하는 것이 훨씬 유연하고 유지보수하기 좋습니다.

---

## 💡 한 줄 요약

> **"Vector는 머리 쓰지 않고 몸으로 빠르게 나르는 '택배 기사' 역할이고, GoLang은 안전하게 보관된 택배(Redpanda)를 하나씩 뜯어서 똑똑하게 분류하는 '물류 센터 검수원' 역할을 하는 것입니다."**

이 역할 분담 덕분에 하루 수십억 건의 대규모 TMS 로그 환경에서도 시스템이 지연(Latency) 없이 24시간 안정적으로 돌아갈 수 있게 됩니다.

---

## 관련 문서

### 국가코드 처리방법.md