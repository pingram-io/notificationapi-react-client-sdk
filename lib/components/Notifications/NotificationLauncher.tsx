import { useContext, useState } from 'react';
import { Inbox } from './Inbox';
import { UnreadBadge } from './UnreadBadge';
import { NotificationPopupProps } from './NotificationPopup';
import { NotificationAPIContext } from '../Provider/context';
import { NotificationPreferencesPopup } from '../Preferences';
import { Position } from './interface';
import { NotificationsOutlined } from '@mui/icons-material';
import { IconButton, Popover, useTheme } from '@mui/material';
import { getThemeColors } from '../../utils/theme';

type NotificationLaucherProps = NotificationPopupProps & {
  position?: keyof typeof Position;
  offsetX?: number | string;
  offsetY?: number | string;
  buttonStyles?: React.CSSProperties;
};

export const NotificationLauncher: React.FC<NotificationLaucherProps> = (
  props
) => {
  const [openPreferences, setOpenPreferences] = useState(false);
  const [open, setOpen] = useState(false);
  const context = useContext(NotificationAPIContext);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const theme = useTheme();
  const themeColors = getThemeColors(theme);

  if (!context) {
    return null;
  }

  const config: Required<NotificationLaucherProps> = {
    buttonIcon: props.buttonIcon || (
      <NotificationsOutlined
        style={{
          fontSize: props.buttonIconSize || 20,
          color: props.iconColor || themeColors.icon
        }}
      />
    ),
    buttonStyles: {
      width: 40,
      height: 40,
      ...props.buttonStyles
    },
    popupWidth: props.popupWidth || 400,
    popupHeight: props.popupHeight || 600,
    buttonIconSize: props.buttonIconSize || 20,
    iconColor: props.iconColor || themeColors.icon,
    pagination: props.pagination || 'INFINITE_SCROLL',
    pageSize: props.pageSize || 10,
    pagePosition: props.pagePosition || 'top',
    popupZIndex: props.popupZIndex || 1030,
    unreadBadgeProps: props.unreadBadgeProps ?? {},
    offsetX: props.offsetX || 16,
    offsetY: props.offsetY || 16,
    position: props.position || 'BOTTOM_RIGHT',
    count: props.count || 'COUNT_UNOPENED_NOTIFICATIONS',
    filter: props.filter || 'ALL',
    header: {
      title: props.header?.title,
      button1ClickHandler:
        props.header?.button1ClickHandler ?? context.markAsArchived,
      button2ClickHandler:
        props.header?.button2ClickHandler ?? (() => setOpenPreferences(true))
    },
    renderers: {
      notification: props.renderers?.notification
    },
    popoverPosition: {
      anchorOrigin: {
        vertical: props.popoverPosition?.anchorOrigin?.vertical ?? 'top',
        horizontal: props.popoverPosition?.anchorOrigin?.horizontal ?? 'left'
      }
    },
    newTab: props.newTab ?? false
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(!open);
    setAnchorEl(event?.currentTarget);
    if (open) {
      context.markAsOpened();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: config.offsetX,
        bottom: config.offsetY,
        zIndex: 999
      }}
    >
      <div
        style={{
          display: 'inline-block'
        }}
      >
        <UnreadBadge {...props.unreadBadgeProps} count={config.count}>
          <IconButton style={config.buttonStyles} onClick={handleClick}>
            {config.buttonIcon}
          </IconButton>
        </UnreadBadge>
      </div>
      <Popover
        open={open}
        anchorEl={anchorEl}
        anchorReference="anchorEl"
        anchorOrigin={{
          horizontal: 'center',
          vertical: 'top'
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center'
        }}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            style: {
              borderRadius: 8,
              backgroundColor: themeColors.paper,
              color: themeColors.text
            }
          }
        }}
      >
        <div
          style={{
            width: config.popupWidth,
            padding: '0 16px',
            zIndex: config.popupZIndex,
            height: config.popupHeight,
            backgroundColor: themeColors.paper,
            color: themeColors.text
          }}
        >
          <Inbox
            maxHeight={config.popupHeight - 73}
            pagination={config.pagination}
            filter={config.filter}
            pageSize={config.pageSize}
            pagePosition={config.pagePosition}
            notificationRenderer={config.renderers.notification}
            header={config.header}
            newTab={config.newTab}
          />
        </div>
      </Popover>
      <NotificationPreferencesPopup
        open={openPreferences}
        onClose={() => setOpenPreferences(false)}
      />
    </div>
  );
};
