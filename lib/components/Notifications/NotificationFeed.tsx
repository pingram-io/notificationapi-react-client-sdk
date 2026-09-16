import { useContext, useEffect, useState } from 'react';
import { Inbox } from './Inbox';
import { NotificationProps } from './Notification';
import { NotificationAPIContext } from '../Provider/context';
import { InboxHeaderProps } from './InboxHeader';
import { NotificationPreferencesPopup } from '../Preferences';
import { InAppNotification } from '@notificationapi/core/dist/interfaces';
import { Filter, Pagination } from './interface';
import { useTheme } from '@mui/material/styles';
import { getThemeColors } from '../../utils/theme';

export type NotificationFeedProps = {
  pagination?: keyof typeof Pagination;
  pageSize?: number;
  pagePosition?: 'top' | 'bottom';
  infiniteScrollHeight?: number;
  style?: React.CSSProperties;
  filter?: keyof typeof Filter | ((n: InAppNotification) => boolean);
  renderers?: {
    notification?: NotificationProps['renderer'];
  };
  header?: InboxHeaderProps;
  imageShape?: 'circle' | 'square';
  newTab?: boolean;
};

export const NotificationFeed: React.FC<NotificationFeedProps> = (props) => {
  const [openPreferences, setOpenPreferences] = useState(false);
  const context = useContext(NotificationAPIContext);
  const theme = useTheme();
  const themeColors = getThemeColors(theme);

  // every 5 seconds
  useEffect(() => {
    if (!context) return;

    context.markAsOpened();
    const interval = setInterval(() => {
      context.markAsOpened();
    }, 5000);

    return () => clearInterval(interval);
  }, [context]);

  if (!context) {
    return null;
  }

  const config: Required<NotificationFeedProps> = {
    pagination: props.pagination || 'INFINITE_SCROLL',
    pageSize: props.pageSize || 5,
    pagePosition: props.pagePosition || 'top',
    style: props.style || {},
    filter: props.filter || Filter.ALL,
    infiniteScrollHeight: props.infiniteScrollHeight
      ? props.infiniteScrollHeight
      : window.innerHeight * 0.75,
    renderers: {
      notification: props.renderers?.notification
    },
    header: {
      title: props.header?.title,
      button1ClickHandler:
        props.header?.button1ClickHandler ?? context.markAsArchived,
      button2ClickHandler:
        props.header?.button2ClickHandler ?? (() => setOpenPreferences(true))
    },
    imageShape: props.imageShape || 'circle',
    newTab: props.newTab ?? false
  };

  return (
    <div
      style={{
        padding: '0 12px',
        boxSizing: 'border-box',
        borderRadius: 8,
        background: themeColors.paper,
        border: `1px solid ${themeColors.border}`,
        color: themeColors.text,
        ...props.style
      }}
    >
      <Inbox
        maxHeight={config.infiniteScrollHeight}
        pagination={config.pagination}
        filter={config.filter}
        pageSize={config.pageSize}
        pagePosition={config.pagePosition}
        notificationRenderer={config.renderers.notification}
        header={config.header}
        imageShape={config.imageShape}
        newTab={config.newTab}
      />
      <NotificationPreferencesPopup
        open={openPreferences}
        onClose={() => setOpenPreferences(false)}
      />
    </div>
  );
};
