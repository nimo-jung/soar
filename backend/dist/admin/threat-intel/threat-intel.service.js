"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatIntelService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const threat_intel_feed_entity_1 = require("./entities/threat-intel-feed.entity");
let ThreatIntelService = class ThreatIntelService {
    feedRepo;
    constructor(feedRepo) {
        this.feedRepo = feedRepo;
    }
    async create(dto) {
        const feed = this.feedRepo.create({ ...dto, dispatchStatus: threat_intel_feed_entity_1.TiDispatchStatus.PENDING, dispatchAttempts: 0 });
        const saved = await this.feedRepo.save(feed);
        await this.dispatchFeed(saved.id);
        return this.feedRepo.findOneOrFail({ where: { id: saved.id } });
    }
    async findAll() {
        return this.feedRepo.find({ order: { createdAt: 'DESC' } });
    }
    async deactivate(id) {
        const feed = await this.feedRepo.findOne({ where: { id } });
        if (!feed)
            throw new common_1.NotFoundException(`TI feed id=${id} not found`);
        await this.feedRepo.update(id, { isActive: false });
    }
    async dispatchFeed(id) {
        const feed = await this.feedRepo.findOne({ where: { id } });
        if (!feed)
            throw new common_1.NotFoundException(`TI feed id=${id} not found`);
        await this.feedRepo.update(id, {
            dispatchAttempts: (feed.dispatchAttempts ?? 0) + 1,
        });
        try {
            await this.mockPublish(feed);
            await this.feedRepo.update(id, {
                dispatchStatus: threat_intel_feed_entity_1.TiDispatchStatus.DISPATCHED,
                dispatchedAt: new Date(),
                dispatchError: null,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await this.feedRepo.update(id, {
                dispatchStatus: threat_intel_feed_entity_1.TiDispatchStatus.FAILED,
                dispatchError: message,
            });
        }
        return this.feedRepo.findOneOrFail({ where: { id } });
    }
    async mockPublish(_feed) {
    }
};
exports.ThreatIntelService = ThreatIntelService;
exports.ThreatIntelService = ThreatIntelService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(threat_intel_feed_entity_1.ThreatIntelFeed)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ThreatIntelService);
//# sourceMappingURL=threat-intel.service.js.map