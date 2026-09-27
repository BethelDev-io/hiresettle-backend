import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Engagement, EngagementStatus } from './entities/engagement.entity';
import { Milestone } from './entities/milestone.entity';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';

@Injectable()
export class EngagementsService {
  constructor(
    @InjectRepository(Engagement)
    private readonly engagementRepository: Repository<Engagement>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
  ) {}

  async create(createEngagementDto: CreateEngagementDto): Promise<Engagement> {
    const engagement = this.engagementRepository.create({
      ...createEngagementDto,
      status: EngagementStatus.DRAFT,
    });
    return this.engagementRepository.save(engagement);
  }

  async findAll(): Promise<Engagement[]> {
    return this.engagementRepository.find({
      relations: ['milestones'],
    });
  }

  async findOne(id: string): Promise<Engagement> {
    const engagement = await this.engagementRepository.findOne({
      where: { id },
      relations: ['milestones'],
    });
    if (!engagement) {
      throw new NotFoundException(`Engagement with id ${id} not found`);
    }
    return engagement;
  }

  async update(
    id: string,
    updateEngagementDto: UpdateEngagementDto,
  ): Promise<Engagement> {
    const engagement = await this.findOne(id);
    Object.assign(engagement, updateEngagementDto);
    return this.engagementRepository.save(engagement);
  }

  async remove(id: string): Promise<void> {
    const engagement = await this.findOne(id);
    await this.engagementRepository.remove(engagement);
  }

  async duplicate(id: string): Promise<Engagement> {
    const source = await this.findOne(id);

    const duplicate = this.engagementRepository.create({
      title: source.title,
      amount: source.amount,
      token: source.token,
      status: EngagementStatus.DRAFT,
      sourceEngagementId: source.id,
    });

    const saved = await this.engagementRepository.save(duplicate);

    if (source.milestones?.length) {
      const milestones = source.milestones.map((milestone) =>
        this.milestoneRepository.create({
          title: milestone.title,
          description: milestone.description,
          amount: milestone.amount,
          engagementId: saved.id,
        }),
      );
      saved.milestones = await this.milestoneRepository.save(milestones);
    }

    return saved;
  }
}
