말씀하신 대로 개념적인 전략을 넘어, 실무에서 성능 병목을 원천 차단할 수 있는 **Docker 환경에서의 ClickHouse 및 RedPanda 고성능 디스크/네트워크 직접 매핑 구현 방법**을 구체적인 설정 파일(`docker-compose.yml`)과 리눅스 커널 최적화 명령어를 통해 명확히 가이드해 드리겠습니다.

이 설정은 컨테이너 가상화 레이어(Veth Pair, Docker Storage Driver)를 우회하여 **네이티브 호스트 PC 스펙의 99% 이상을 끌어내기 위한 엔터프라이즈 표준 규격**입니다.

---

## 🛠️ 1. 고성능 디스크 매핑 (NVMe SSD 볼륨 마운트)

Docker의 기본 볼륨 방식을 쓰면 오버레이 파일 시스템(`overlay2`)을 거치기 때문에 대량 배치 적재 시 디스크 지연이 발생합니다. 호스트의 고속 NVMe SSD 마운트 포인트를 컨테이너 내부로 직접 바인드 마운트(Bind Mount)해야 합니다.

### ① 호스트 OS(Linux) 사전 작업 (파일 시스템 최적화)

ClickHouse와 RedPanda용 고속 NVMe SSD 디스크는 성능과 저널링 오버헤드를 줄이기 위해 `ext4` 또는 `XFS` 파일 시스템으로 포맷하고, 마운트 옵션에 `noatime`(액세스 시간 기록 안 함)을 반드시 줍니다.

```bash
# 호스트에서 NVMe 디스크 마운트 확인 및 옵션 변경 (/etc/fstab 예시)
# /dev/nvme0n1p1  /mnt/nvme-speed  ext4  noatime,nodiratime,data=ordered  0  0

```

### ② docker-compose.yml 디스크 볼륨 설정 규격

상용구(Named Volume)가 아닌, 호스트의 절대 경로를 직접 꽂아 넣는 **바인드 마운트** 구문입니다.

```yaml
version: '3.8'

services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.X # 2026년 상용 안정 버전
    container_name: soar-clickhouse
    volumes:
      # [호스트 경로] : [컨테이너 내부 경로] : [속도 최적화 플래그]
      - /mnt/nvme-speed/clickhouse/data:/var/lib/clickhouse:rw,delegated
      - /mnt/nvme-speed/clickhouse/logs:/var/log/clickhouse-server:rw
    # ClickHouse가 대량의 파일 디스크립터를 열 수 있도록 제한 해제 (중요)
    ulimits:
      nofile:
        soft: 262144
        hard: 262144

  redpanda:
    image: docker.redpanda.com/redpandadata/redpanda:v24.X
    container_name: soar-redpanda
    volumes:
      # RedPanda의 실시간 로그 세그먼트 디스크 직접 매핑
      - /mnt/nvme-speed/redpanda/data:/var/lib/redpanda/data:rw,delegated
    ulimits:
      nofile:
        soft: 100000
        hard: 100000

```

> **💡 `delegated` 플래그의 이유**: 컨테이너 내부의 쓰기 작업이 호스트 디스크에 실시간으로 완벽히 동기화될 때까지 컨테이너 프로세스를 대기시키지 않고, 호스트 OS의 버퍼 캐시를 믿고 비동기 처리하여 물리적인 Write 성능을 극대화합니다.

---

## 🌐 2. 네트워크 병목 방지 (Host Network 모드)

Docker는 기본적으로 브리지(`bridge`) 네트워크 환경을 씁니다. 외부 로그가 들어오면 호스트 OS ➡️ Docker 내부의 가상 네트워크 카드(`veth`) ➡️ iptables 포트 포워딩을 거치며 CPU 자원을 갉아먹고 레이턴시가 늘어납니다.
초당 수십만 건의 Syslog와 대량의 배치를 주고받는 인프라는 **호스트의 네트워크 카드를 컨테이너가 직접 공유**해야 합니다.

### ① docker-compose.yml 네트워크 설정 규격

`ports` 매핑을 과감히 제거하고 `network_mode: "host"`를 선언합니다.

```yaml
services:
  clickhouse:
    # ... 이미지 및 볼륨 설정 생략 ...
    network_mode: "host" # 호스트의 8123(HTTP), 9000(Native) 포트를 그대로 점유
    environment:
      - CLICKHOUSE_USER=soar_admin
      - CLICKHOUSE_PASSWORD=secure_password

  redpanda:
    # ... 이미지 및 볼륨 설정 생략 ...
    network_mode: "host" # 호스트의 9092(Kafka API), 9644(Admin API) 포트를 그대로 점유
    command:
      - redpanda start
      - --kafka-addr=0.0.0.0:9092
      - --advertise-kafka-addr=192.168.1.100:9092 # 실제 서버 호스트 IP 명시

```

### ⚠️ Host Network 모드 적용 시 주의점 및 대응책

1. **포트 충돌 방지**: 호스트에 이미 설치된 다른 서비스나 MariaDB 등과 포트가 겹치지 않는지 사전에 체크해야 합니다. (예: ClickHouse의 8123 포트가 이미 사용 중이라면 ClickHouse 설정 파일에서 포트를 변경해야 함)
2. **보안 방화벽**: Docker Bridge 모드일 때는 Docker가 자체적으로 내부 포트를 숨겨주었지만, Host 모드인 순간 외부로 포트가 즉시 노출됩니다. 리눅스 호스트의 `ufw` 또는 `iptables`에서 인가된 수집기(Vector)와 GoLang 파이프라인 엔진 IP만 접근할 수 있도록 인바운드 방화벽 규칙을 철저히 걸어야 합니다.

---

## 🚀 3. 네이티브 성능 유지를 위한 호스트 OS(Linux) 커널 튜닝

컨테이너 환경 설정을 아무리 잘해도 호스트 리눅스 커널이 대량의 I/O를 받아줄 준비가 안 되어 있으면 무용지물입니다. 고급 아키텍트(8년 차 이상)가 인프라 세팅 시 호스트 서버 스크립트에 반드시 포함해야 하는 설정입니다.

호스트 OS의 `/etc/sysctl.conf` 파일에 아래 내용을 추가하여 대량 로그 유입 시 운영체제가 지치지 않도록 만듭니다.

```ini
# 1. ClickHouse의 대규모 메모리 매핑 연산을 위한 가상 메모리 제한 상향
vm.max_map_count=262144

# 2. 네트워크 소켓 버퍼 크기 극대화 (대량 Syslog 수신 및 대용량 패킷 처리용)
net.core.rmem_max=16777216
net.core.wmem_max=16777216
net.core.netdev_max_backlog=10000

# 3. TCP 연결 대기열(Backlog) 크기 상향
net.core.somaxconn=4096

```

설정 후 호스트에서 `sudo sysctl -p` 명령어로 즉시 동적 반영합니다.

---

## 🎯 요약 가이드라인

웹 플랫폼(NestJS, React)이나 AI 엔진(FastAPI)은 일반적인 Docker Bridge 구조로 격리하여 안전하게 띄우고, 오직 **대량 데이터 I/O의 중심축인 ClickHouse와 RedPanda에만 위의 `network_mode: "host"`와 `바인드 마운트` 설정을 집중 적용**합니다.

이렇게 설계 및 구현을 완료하면, 가상화 환경(Docker)의 이점인 '쉬운 배포/관리'를 누리면서도 성능은 **'물리 서버 직접 설치(Bare-metal)'** 수준의 가공할 만한 속도를 뽑아낼 수 있습니다. 이 구현 명세 체계를 그대로 `copilot.md` 인프라 섹션에 이관하시기 바랍니다.