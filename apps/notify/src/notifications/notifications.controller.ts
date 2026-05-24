import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiVersion, Public } from '@orbit/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationV1Response, NotificationV2Response } from './dto/notification.response';
import { SendNotificationHandler } from './api/send-notification.handler';
import { toNotificationV1Response, toNotificationV2Response } from './shared/notification.mapper';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
// TODO(auth): swap @Public for proper user-auth (JWT/OIDC) when the
// identity flow lands. See ADR 0007 — this is the baseline, not the end
// state.
@Public()
@Controller({ path: 'notifications' })
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly sendNotification: SendNotificationHandler,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create (send) a notification — calls iam.GetUser over gRPC' })
  async create(@Body() body: CreateNotificationDto): Promise<NotificationV2Response> {
    return this.sendNotification.asRest(body);
  }

  @Get()
  @ApiOperation({ summary: 'List notifications (v2 shape)' })
  async list(): Promise<NotificationV2Response[]> {
    const all = await this.notifications.findAll();
    return all.map(toNotificationV2Response);
  }

  @Get(':id')
  @ApiVersion('1')
  @ApiOperation({ summary: 'Get notification (v1: minimal)' })
  async getByIdV1(@Param('id') id: string): Promise<NotificationV1Response> {
    const n = await this.notifications.findById(id);
    return toNotificationV1Response(n);
  }

  @Get(':id')
  @ApiVersion('2')
  @ApiOperation({ summary: 'Get notification (v2: full payload)' })
  async getByIdV2(@Param('id') id: string): Promise<NotificationV2Response> {
    const n = await this.notifications.findById(id);
    return toNotificationV2Response(n);
  }
}
