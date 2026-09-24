import { useContext } from 'react';
import { Preferences } from './Preferences';
import { NotificationAPIContext } from '../Provider/context';
import { useTheme } from '@mui/material';
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
      <Preferences />
    </div>
  );
}
