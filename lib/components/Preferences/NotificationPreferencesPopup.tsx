import { useContext } from 'react';
import { Preferences } from './Preferences';
import { NotificationAPIContext } from '../Provider/context';
import { Dialog, DialogTitle, DialogContent, useTheme } from '@mui/material';
import { getThemeColors } from '../../utils/theme';

type NotificationPreferencesPopupProps = {
  open?: boolean;
  onClose?: () => void;
  collapse?: boolean;
};

export function NotificationPreferencesPopup(
  props: NotificationPreferencesPopupProps
) {
  const context = useContext(NotificationAPIContext);
  const theme = useTheme();
  const themeColors = getThemeColors(theme);

  if (!context) {
    return null;
  }
  const config: Required<NotificationPreferencesPopupProps> = {
    open: props.open === undefined ? true : props.open,
    onClose: props.onClose || (() => {}),
    collapse: props.collapse === undefined ? false : props.collapse
  };

  return (
    <Dialog
      open={config.open}
      onClose={config.onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          borderRadius: 8,
          backgroundColor: themeColors.paper,
          color: themeColors.text
        }
      }}
      aria-hidden={!config.open}
      scroll="body"
    >
      <DialogTitle sx={{ color: themeColors.text }}>
        Notification Preferences
      </DialogTitle>
      <DialogContent
        sx={{ backgroundColor: themeColors.paper, color: themeColors.text }}
      >
        <Preferences />
      </DialogContent>
    </Dialog>
  );
}
