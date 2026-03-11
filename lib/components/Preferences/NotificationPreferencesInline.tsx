import { useContext } from 'react';
import { Preferences } from './Preferences';
import { NotificationAPIContext } from '../Provider/context';
import { Divider, useTheme } from '@mui/material';
import WebPushOptInMessage from '../WebPush/WebPushOptInMessage';
import { getThemeColors } from '../../utils/theme';

type NotificationPreferencesInlineProps = object;

export function NotificationPreferencesInline(
  _props: NotificationPreferencesInlineProps
) {
  const context = useContext(NotificationAPIContext);
  const theme = useTheme();
  const themeColors = getThemeColors(theme);

  if (!context) {
    return null;
  }
  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${themeColors.border}`,
        backgroundColor: themeColors.paper,
        color: themeColors.text
      }}
    >
      <Preferences />{' '}
      {context.webPushOptInMessage && (
        <div>
          <Divider
            style={{ margin: '10px 0', borderColor: themeColors.divider }}
          />
          <WebPushOptInMessage
            hideAfterInteraction={false}
            descriptionStyle={{
              flexDirection: 'column', // Stack the elements vertically
              justifyContent: 'flex-start', // Align items to the left
              fontSize: '14px',
              alignItems: 'flex-start' // Align items to the left
            }}
            buttonContainerStyle={{
              justifyContent: 'flex-start', // Align buttons to the left
              alignItems: 'flex-start', // Align buttons to the left
              marginTop: '10px' // Add some space between message and buttons
            }}
          />
        </div>
      )}
    </div>
  );
}
