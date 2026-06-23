// networks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { NetworkEntity } from './entities/network.entity';
import { NetworkEdgeEntity } from './entities/network-edge.entity'; 
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { TenantContext } from '../../common/context/tenant.context';

@Injectable()
export class NetworksService {
  constructor(
    private readonly tenantConn: TenantConnectionService
  ) {}
  
  // 노드(NetworkEntity) 레포지토리 획득
  private async getNodeRepo(tenantId: string) {
    const conn = await this.tenantConn.getConnection(tenantId);
    return conn.getRepository(NetworkEntity);
  }

  // 연결선(NetworkEdgeEntity) 레포지토리 획득
  private async getEdgeRepo(tenantId: string) {
    const conn = await this.tenantConn.getConnection(tenantId);
    return conn.getRepository(NetworkEdgeEntity);
  }
  
  /**
   * 컨트롤러의 findAll() 대응
   * 프론트엔드가 요구하는 규격에 맞춰 nodes 배열과 edges 배열을 한 번에 반환합니다.
   */
  async findAllByTenant(tenantIdParam?: string): Promise<{ nodes: NetworkEntity[]; edges: NetworkEdgeEntity[] }> {
    // 컨트롤러에서 tenantId를 넘겨주지 않았을 경우 TenantContext에서 폴백 처리
    const tenantId = tenantIdParam || TenantContext.getTenantId();
    
    const nodeRepo = await this.getNodeRepo(tenantId);
    const edgeRepo = await this.getEdgeRepo(tenantId);

    // 해당 테넌트 데이터베이스 내의 모든 노드와 엣지를 조회
    // 마이그레이션 구조에 따라 tenant_id 조건이 필요하다면 { where: { tenant_id: tenantId } } 형태로 쿼리 가능
    const [nodes, edges] = await Promise.all([
      nodeRepo.find(),
      edgeRepo.find()
    ]);

    return { nodes, edges };
  }

  /**
   * 네트워크 노드 생성
   */
  async create(tenantIdParam: string, dto: CreateNetworkDto) {
    const tenantId = tenantIdParam || TenantContext.getTenantId();
    const repo = await this.getNodeRepo(tenantId);
    
    // 마이그레이션에 정의한 기본 테넌트 필드가 엔티티에 포함되어 있다면 강제 매핑 보장
    const entity = repo.create({
      ...dto,
      tenant_id: tenantId 
    } as any);
    
    return repo.save(entity);
  }

  /**
   * 네트워크 노드 수정
   */
  async update(tenantIdParam: string, id: number, dto: UpdateNetworkDto) {
    const tenantId = tenantIdParam || TenantContext.getTenantId();
    const repo = await this.getNodeRepo(tenantId);
    return repo.update(id, dto);
  }

  /**
   * 네트워크 노드 배치 좌표(ReactFlow) 실시간 저장
   */
  async updateNodePosition(tenantIdParam: string, id: number, x_pos: number, y_pos: number) {
    const tenantId = tenantIdParam || TenantContext.getTenantId();
    const repo = await this.getNodeRepo(tenantId);
    
    const node = await repo.findOne({ where: { id } as any });
    if (!node) {
      throw new NotFoundException('해당 노드를 찾을 수 없습니다.');
    }

    // 좌표 정보 업데이트 (엔티티에 x_pos, y_pos 반영 필요)
    (node as any).x_pos = x_pos;
    (node as any).y_pos = y_pos;
    
    return repo.save(node);
  }

  /**
   * 네트워크 노드 삭제
   */
  async remove(tenantIdParam: string, id: number) {
    const tenantId = tenantIdParam || TenantContext.getTenantId();
    const repo = await this.getNodeRepo(tenantId);
    return repo.delete(id);
  }

  // =========================================================================
  // 엣지(Edge - 연결선) CRUD 파트 마무리
  // =========================================================================

  /**
   * 네트워크 연결선(Edge) 생성
   */
  async createEdge(tenantIdParam: string, edgeDto: { source_id: number; target_id: number; label?: string; type?: string }) {
    const tenantId = tenantIdParam || TenantContext.getTenantId();
    const edgeRepo = await this.getEdgeRepo(tenantId);

    const edgeEntity = edgeRepo.create({
      tenant_id: tenantId,
      source_id: edgeDto.source_id,
      target_id: edgeDto.target_id,
      label: edgeDto.label || null,
      type: edgeDto.type || 'smoothstep'
    } as any);

    return edgeRepo.save(edgeEntity);
  }

  /**
   * 네트워크 연결선(Edge) 삭제
   */
  async removeEdge(tenantIdParam: string, id: number) {
    const tenantId = tenantIdParam || TenantContext.getTenantId();
    const edgeRepo = await this.getEdgeRepo(tenantId);
    
    const result = await edgeRepo.delete(id);
    if (!result || result.affected === 0) {
      throw new NotFoundException('해당 테넌트 영역에 존재하지 않는 연결선이거나 이미 삭제되었습니다.');
    }
    
    return result;
  }
}