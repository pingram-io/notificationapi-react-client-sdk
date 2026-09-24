import { createContext } from 'react';
import { NotificationAPIClientSDK } from '@notificationapi/core';
import {
  BaseDeliveryOptions,
  Channels,
  DeliveryOptionsForEmail,
  DeliveryOptionsForInappWeb,
  GetPreferencesResponse,
  InAppNotification,
  UserAccountMetadata
} from '@notificationapi/core/dist/interfaces';

export type Context = {
  notifications?: InAppNotification[];
  preferences?: GetPreferencesResponse;
  userAccountMetaData?: { userAccountMetadata: UserAccountMetadata };
  loadNotifications: (initial?: boolean) => void;
  markAsOpened: () => void;
  markAsArchived: (ids: string[] | 'ALL') => void;
  markAsUnarchived: (ids: string[] | 'ALL') => void;
  markAsClicked: (ids: string[]) => void;
  updateDelivery: (
    notificationId: string,
    channel: Channels,
    delivery:
      | DeliveryOptionsForEmail
      | DeliveryOptionsForInappWeb
      | BaseDeliveryOptions,
    subNotificationId?: string
  ) => void;
  updateDeliveries: (
    params: {
      notificationId: string;
      channel: Channels;
      delivery:
        | DeliveryOptionsForEmail
        | DeliveryOptionsForInappWeb
        | BaseDeliveryOptions;
      subNotificationId?: string;
    }[]
  ) => void;
  getClient: () => typeof NotificationAPIClientSDK;
};

export const NotificationAPIContext = createContext<Context | undefined>(
  undefined
);
