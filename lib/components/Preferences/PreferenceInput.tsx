import {
  BaseDeliveryOptions,
  DeliveryOptionsForEmail,
  DeliveryOptionsForInappWeb,
  GetPreferencesResponse
} from '@notificationapi/core/dist/interfaces';
import { getChannelIcon, getChannelLabel } from './channelUtils';
import { Channels } from '../Notifications/interface';
import {
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Typography,
  useTheme
} from '@mui/material';
import { getThemeColors } from '../../utils/theme';

const sortChannels = (a: Channels, b: Channels) => {
  const order = [
    'EMAIL',
    'INAPP_WEB',
    'SMS',
    'CALL',
    'PUSH',
    'WEB_PUSH',
    'SLACK'
  ];
  return order.indexOf(a) - order.indexOf(b);
};

const sortDeliveries = (
  a: DeliveryOptionsForEmail | DeliveryOptionsForInappWeb | BaseDeliveryOptions,
  b: DeliveryOptionsForEmail | DeliveryOptionsForInappWeb | BaseDeliveryOptions
) => {
  const order = ['off', 'instant', 'hourly', 'daily', 'weekly', 'monthly'];
  return order.indexOf(a) - order.indexOf(b);
};

const getDeliveryLabel = (
  d: DeliveryOptionsForEmail | DeliveryOptionsForInappWeb | BaseDeliveryOptions
) => {
  const labels = {
    off: 'Off',
    instant: 'Instant',
    hourly: 'Hourly',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly'
  };
  return labels[d];
};

type Props = {
  preferences: GetPreferencesResponse['preferences'];
  notification: GetPreferencesResponse['notifications'][0];
  updateDelivery: (
    notificationId: string,
    channel: Channels,
    delivery:
      | DeliveryOptionsForEmail
      | DeliveryOptionsForInappWeb
      | BaseDeliveryOptions,
    subNotificationId?: string
  ) => void;
  subNotificationId?: string;
};

export const PreferenceInput = ({
  notification,
  preferences,
  updateDelivery,
  subNotificationId
}: Props) => {
  const theme = useTheme();
  const themeColors = getThemeColors(theme);

  return (
    <>
      {(notification.channels as Channels[])
        .filter(
          (channel) =>
            channel !== Channels.WEB_PUSH && channel !== Channels.SLACK
        )
        .sort(sortChannels)
        .map((channel: Channels, i) => {
          const preference = preferences.find(
            (p) =>
              p.notificationId === notification.notificationId &&
              p.channel === channel
          );

          if (!preference) {
            return null;
          }

          const name = getChannelLabel(channel);
          const icon = getChannelIcon(channel);

          const deliveries = Object.keys(
            notification.options![channel]!
          ).filter(
            (o) => o !== 'defaultDeliveryOption' && o !== 'defaultDeliverOption'
          ) as
            | DeliveryOptionsForEmail[]
            | DeliveryOptionsForInappWeb[]
            | BaseDeliveryOptions[];

          let selector;
          if (deliveries.length === 1) {
            selector = (
              <Typography variant="body1" sx={{ color: themeColors.text }}>
                {getDeliveryLabel(preference.delivery)}
              </Typography>
            );
          } else if (deliveries.length === 2 && deliveries.includes('off')) {
            selector = (
              <Switch
                checked={preference.delivery !== 'off'}
                onChange={(_state, checked) => {
                  if (checked) {
                    const delivery = deliveries.find((d) => d !== 'off')!;
                    updateDelivery(
                      notification.notificationId,
                      channel,
                      delivery,
                      subNotificationId
                    );
                  } else {
                    updateDelivery(
                      notification.notificationId,
                      channel,
                      'off',
                      subNotificationId
                    );
                  }
                }}
              />
            );
          } else {
            selector = (
              <>
                <Switch
                  checked={preference.delivery !== 'off'}
                  onChange={(_state, checked) => {
                    if (checked) {
                      const delivery = deliveries
                        .sort(sortDeliveries)
                        .find((d) => d !== 'off')!;
                      updateDelivery(
                        notification.notificationId,
                        channel,
                        delivery,
                        subNotificationId
                      );
                    } else {
                      updateDelivery(
                        notification.notificationId,
                        channel,
                        'off',
                        subNotificationId
                      );
                    }
                  }}
                />
                <div
                  style={{
                    width: '100%',
                    marginTop: 8,
                    maxHeight: preference.delivery !== 'off' ? 1000 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease'
                  }}
                >
                  <div>
                    <div style={{ marginTop: 20 }}>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        sx={{ color: themeColors.text }}
                      >
                        Choose frequency:
                      </Typography>
                    </div>
                    <RadioGroup
                      value={preference.delivery}
                      onChange={(e) => {
                        updateDelivery(
                          notification.notificationId,
                          channel,
                          e.target.value as
                            | DeliveryOptionsForEmail
                            | DeliveryOptionsForInappWeb
                            | BaseDeliveryOptions,
                          subNotificationId
                        );
                      }}
                    >
                      <Stack direction="column" style={{ paddingTop: 10 }}>
                        {deliveries
                          .filter((d) => d !== 'off')
                          .sort(sortDeliveries)
                          .map((d) => (
                            <FormControlLabel
                              control={<Radio />}
                              value={d}
                              key={d}
                              label={getDeliveryLabel(d)}
                            />
                          ))}
                      </Stack>
                    </RadioGroup>
                  </div>
                </div>
              </>
            );
          }
          return (
            <div key={channel}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  marginTop: i === 0 ? 0 : 12,
                  marginBottom: i === notification.channels.length - 1 ? 0 : 12
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {icon}
                  <Typography variant="body1" sx={{ color: themeColors.text }}>
                    {name}
                  </Typography>
                </div>
                {selector}
              </div>
              {i !== notification.channels.length - 1 && (
                <Divider sx={{ borderColor: themeColors.divider }} />
              )}
            </div>
          );
        })}
    </>
  );
};
