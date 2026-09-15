import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { NotificationAPIClientSDK } from '@notificationapi/core';
import {
  GetPreferencesResponse,
  InAppNotification,
  User,
  UserAccountMetadata
} from '@notificationapi/core/dist/interfaces';
import {
  BaseDeliveryOptions,
  Channels,
  DeliveryOptionsForEmail,
  DeliveryOptionsForInappWeb,
  API_REGION,
  WS_REGION
} from '@notificationapi/core/dist/interfaces';
import { Context, NotificationAPIContext } from './context';
import { createDebugLogger, formatApiCall } from '../../utils/debug';
import { ThemeProvider } from '@mui/material/styles';
import {
  NotificationAPITheme,
  createNotificationAPITheme
} from '../../utils/theme';

type Props = (
  | {
      userId: string;
    }
  | {
      user: Omit<User, 'createdAt' | 'updatedAt' | 'lastSeenTime'>;
    }
) & {
  clientId: string;
  hashedUserId?: string;
  apiURL?: string | API_REGION;
  wsURL?: string | WS_REGION;
  initialLoadMaxCount?: number;
  initialLoadMaxAge?: Date;
  playSoundOnNewNotification?: boolean;
  newNotificationSoundPath?: string;
  client?: typeof NotificationAPIClientSDK;
  debug?: boolean;
  onNewNotifications?: (notifications: InAppNotification[]) => void;
  theme?: NotificationAPITheme;
};

export const NotificationAPIProvider: React.FunctionComponent<
  PropsWithChildren<Props>
> & {
  useNotificationAPIContext: typeof useNotificationAPIContext;
} = (props) => {
  const debug = useMemo(
    () => createDebugLogger(props.debug || false),
    [props.debug]
  );

  debug.log('NotificationAPI Provider initializing', {
    clientId: props.clientId,
    userId: 'userId' in props ? props.userId : props.user.id,
    debug: props.debug || false,
    timestamp: new Date().toISOString()
  });

  const defaultConfigs = {
    apiURL: 'api.notificationapi.com',
    wsURL: 'ws.notificationapi.com',
    initialLoadMaxCount: 1000,
    initialLoadMaxAge: new Date(new Date().setMonth(new Date().getMonth() - 3)),
    playSoundOnNewNotification: false,
    newNotificationSoundPath:
      'https://proxy.notificationsounds.com/notification-sounds/elegant-notification-sound/download/file-sounds-1233-elegant.mp3'
  };

  const config = {
    ...defaultConfigs,
    ...props,
    user: 'userId' in props ? { id: props.userId } : props.user
  };

  debug.log('Configuration loaded', config);

  const [notifications, setNotifications] = useState<InAppNotification[]>();
  const [preferences, setPreferences] = useState<GetPreferencesResponse>();
  const [userAccountMetaData, setUserAccountMetaData] = useState<{
    userAccountMetadata: UserAccountMetadata;
  }>();
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [oldestLoaded, setOldestLoaded] = useState(new Date().toISOString());
  const [hasMore, setHasMore] = useState(true);

  const playSound = useCallback(() => {
    if (config.playSoundOnNewNotification) {
      debug.log('Playing notification sound', {
        soundPath: config.newNotificationSoundPath
      });
      const audio = new Audio(config.newNotificationSoundPath);
      audio.play().catch((e) => {
        debug.error('Failed to play new notification sound', e);
        console.log('Failed to play new notification sound:', e);
      });
    }
  }, [
    config.newNotificationSoundPath,
    config.playSoundOnNewNotification,
    debug
  ]);

  const addNotificationsToState = useCallback(
    (notis: InAppNotification[]) => {
      debug.group('Adding notifications to state');
      debug.log('Received notifications', {
        count: notis?.length || 0,
        notifications: notis
      });

      const now = new Date().toISOString();
      setNotifications((prev) => {
        const prevCount = prev?.length || 0;
        debug.log('Current notifications count', prevCount);

        // Ensure the notifications are an array
        notis = Array.isArray(notis) ? notis : [];

        notis = notis.filter((n) => {
          const isExpired =
            n.expDate && new Date(n.expDate).toISOString() > now;
          const isFuture =
            new Date(n.date).getTime() > new Date(now).getTime() + 1000; // Allow for 1 second margin
          const shouldInclude = !isExpired && !isFuture;

          if (!shouldInclude) {
            debug.log('Filtering out notification', {
              id: n.id,
              reason: isExpired ? 'expired' : 'future',
              expDate: n.expDate,
              date: n.date
            });
          }

          return shouldInclude;
        });

        // This also ensures that the prev is always an array to avoid errors
        prev = Array.isArray(prev) ? prev : [];

        const updatedNotifications = [
          ...notis.filter((n) => {
            const isDuplicate = prev.find((p) => p.id === n.id);
            if (isDuplicate) {
              debug.log('Filtering out duplicate notification', { id: n.id });
            }
            return !isDuplicate;
          }),
          ...prev
        ];

        debug.log('State updated', {
          previousCount: prevCount,
          newCount: updatedNotifications.length,
          addedCount: notis.length
        });

        debug.groupEnd();
        return updatedNotifications;
      });
    },
    [debug]
  );

  const { onNewNotifications } = props;
  const handleNewInAppNotifications = useCallback(
    (notifications: InAppNotification[]) => {
      debug.log('Received new in-app notifications via WebSocket', {
        count: notifications?.length || 0,
        notifications
      });
      playSound();
      addNotificationsToState(notifications);
      if (onNewNotifications) {
        debug.log('Calling onNewNotifications callback', {
          count: notifications?.length || 0
        });
        onNewNotifications(notifications);
      }
    },
    [playSound, addNotificationsToState, onNewNotifications, debug]
  );

  const client = useMemo(() => {
    debug.group('Initializing NotificationAPI client');

    const clientConfig = {
      clientId: config.clientId,
      userId: config.user.id,
      hashedUserId: config.hashedUserId,
      host: config.apiURL,
      websocketHost: config.wsURL,
      debug: config.debug
    };

    debug.log('Client configuration', clientConfig);

    const client = props.client
      ? props.client
      : NotificationAPIClientSDK.init({
          ...clientConfig,
          onNewInAppNotifications: handleNewInAppNotifications
        });

    //  identify user
    const identifyData = {
      email: config.user.email,
      number: config.user.number
    };

    debug.log('Identifying user', identifyData);
    client.identify(identifyData);
    debug.groupEnd();

    return client;
  }, [
    config.clientId,
    config.user.id,
    config.user.email,
    config.user.number,
    config.hashedUserId,
    config.debug,
    handleNewInAppNotifications,
    props.client,
    config.apiURL,
    config.wsURL,
    debug
  ]);

  // Notificaiton loading and state updates
  const fetchNotifications = useCallback(
    async (date: string, count: number) => {
      debug.group('Fetching notifications');
      debug.log(
        'Fetch parameters',
        formatApiCall('GET', '/notifications', { date, count })
      );

      try {
        const res = await client.rest.getNotifications(date, count);
        debug.log('Fetch successful', {
          notificationsCount: res.notifications?.length || 0,
          oldestReceived: res.oldestReceived,
          couldLoadMore: res.couldLoadMore
        });

        setOldestLoaded(res.oldestReceived);
        setHasMore(res.couldLoadMore);
        addNotificationsToState(res.notifications);
        debug.groupEnd();
      } catch (error) {
        debug.error('Failed to fetch notifications', error, { date, count });
        debug.groupEnd();
        throw error;
      }
    },
    [addNotificationsToState, client.rest, debug]
  );
  const hasMoreRef = useRef(hasMore);
  const loadingNotificationsRef = useRef(loadingNotifications);
  const oldestLoadedRef = useRef(oldestLoaded);

  useEffect(() => {
    hasMoreRef.current = hasMore;
    loadingNotificationsRef.current = loadingNotifications;
    oldestLoadedRef.current = oldestLoaded;
  }, [hasMore, loadingNotifications, oldestLoaded]);
  const loadNotifications = useCallback(
    async (initial?: boolean) => {
      debug.group(`Loading notifications (${initial ? 'initial' : 'more'})`);
      debug.log('Load conditions', {
        initial,
        hasMore: hasMoreRef.current,
        loading: loadingNotificationsRef.current
      });

      if (
        !initial &&
        (!hasMoreRef.current || loadingNotificationsRef.current)
      ) {
        debug.log('Skipping load - conditions not met');
        debug.groupEnd();
        return;
      }

      setLoadingNotifications(true);
      debug.log('Loading started');

      try {
        await fetchNotifications(
          initial ? new Date().toISOString() : oldestLoadedRef.current,
          initial ? config.initialLoadMaxCount : 1000
        );
        debug.log('Loading completed successfully');
      } catch (error) {
        debug.error('Loading failed', error);
        throw error;
      } finally {
        setLoadingNotifications(false);
        debug.groupEnd();
      }
    },
    [config.initialLoadMaxCount, fetchNotifications, debug]
  );

  const markAsClicked = async (_ids: string[]) => {
    debug.group('Marking notifications as clicked');
    debug.log('Requested IDs', _ids);

    if (!notifications) {
      debug.warn('No notifications available');
      debug.groupEnd();
      return;
    }

    const date = new Date().toISOString();
    const ids: string[] = notifications
      .filter((n) => _ids.includes(n.id) && !n.clicked)
      .map((n) => n.id);

    debug.log('Filtered IDs for update', {
      requestedCount: _ids.length,
      actualCount: ids.length,
      ids
    });

    if (ids.length === 0) {
      debug.log('No notifications to update');
      debug.groupEnd();
      return;
    }

    try {
      debug.log(
        'Updating notifications via API',
        formatApiCall('PUT', '/notifications/clicked', { ids })
      );
      client.updateInAppNotifications({ ids, clicked: true });

      setNotifications((prev) => {
        if (!prev) return [];
        const newNotifications = [...prev];
        newNotifications
          .filter((n) => ids.includes(n.id))
          .forEach((n) => {
            n.clicked = date;
          });
        debug.log('Local state updated', { updatedCount: ids.length });
        return newNotifications;
      });
      debug.groupEnd();
    } catch (error) {
      debug.error('Failed to mark notifications as clicked', error, { ids });
      debug.groupEnd();
      throw error;
    }
  };

  const markAsOpened = async () => {
    debug.group('Marking notifications as opened');

    if (!notifications) {
      debug.warn('No notifications available');
      debug.groupEnd();
      return;
    }

    const date = new Date().toISOString();
    const ids: string[] = notifications
      .filter((n) => !n.opened || !n.seen)
      .map((n) => n.id);

    debug.log('Notifications to mark as opened', { count: ids.length, ids });

    if (ids.length === 0) {
      debug.log('All notifications already opened');
      debug.groupEnd();
      return;
    }

    try {
      debug.log(
        'Updating notifications via API',
        formatApiCall('PUT', '/notifications/opened', { ids })
      );
      client.updateInAppNotifications({
        ids,
        opened: true
      });

      setNotifications((prev) => {
        if (!prev) return [];
        const newNotifications = [...prev];
        newNotifications
          .filter((n) => ids.includes(n.id))
          .forEach((n) => {
            n.opened = date;
            n.seen = true;
          });
        debug.log('Local state updated', { updatedCount: ids.length });
        return newNotifications;
      });
      debug.groupEnd();
    } catch (error) {
      debug.error('Failed to mark notifications as opened', error, { ids });
      debug.groupEnd();
      throw error;
    }
  };

  const markAsUnarchived = async (_ids: string[] | 'ALL') => {
    debug.group('Marking notifications as unarchived');
    debug.log('Requested operation', { ids: _ids });

    if (!notifications) {
      debug.warn('No notifications available');
      debug.groupEnd();
      return;
    }

    const ids: string[] = notifications
      .filter((n) => {
        return n.archived && (_ids === 'ALL' || _ids.includes(n.id));
      })
      .map((n) => n.id);

    debug.log('Filtered notifications for unarchiving', {
      count: ids.length,
      ids
    });

    if (ids.length === 0) {
      debug.log('No archived notifications to unarchive');
      debug.groupEnd();
      return;
    }

    try {
      debug.log(
        'Updating notifications via API',
        formatApiCall('PUT', '/notifications/unarchived', { ids })
      );
      client.updateInAppNotifications({
        ids,
        archived: false
      });

      setNotifications((prev) => {
        if (!prev) return [];
        const newNotifications = [...prev];
        newNotifications
          .filter((n) => ids.includes(n.id))
          .forEach((n) => {
            n.archived = undefined;
          });
        debug.log('Local state updated', { unarchivedCount: ids.length });
        return newNotifications;
      });
      debug.groupEnd();
    } catch (error) {
      debug.error('Failed to unarchive notifications', error, { ids });
      debug.groupEnd();
      throw error;
    }
  };

  const markAsArchived = async (_ids: string[] | 'ALL') => {
    debug.group('Marking notifications as archived');
    debug.log('Requested operation', { ids: _ids });

    if (!notifications) {
      debug.warn('No notifications available');
      debug.groupEnd();
      return;
    }

    const date = new Date().toISOString();
    const ids: string[] = notifications
      .filter((n) => {
        return !n.archived && (_ids === 'ALL' || _ids.includes(n.id));
      })
      .map((n) => n.id);

    debug.log('Filtered notifications for archiving', {
      count: ids.length,
      ids
    });

    if (ids.length === 0) {
      debug.log('No unarchived notifications to archive');
      debug.groupEnd();
      return;
    }

    try {
      debug.log(
        'Updating notifications via API',
        formatApiCall('PUT', '/notifications/archived', { ids })
      );
      client.updateInAppNotifications({ ids, archived: true });

      setNotifications((prev) => {
        if (!prev) return [];
        const newNotifications = [...prev];
        newNotifications
          .filter((n) => ids.includes(n.id))
          .forEach((n) => {
            n.archived = date;
          });
        debug.log('Local state updated', { archivedCount: ids.length });
        return newNotifications;
      });
      debug.groupEnd();
    } catch (error) {
      debug.error('Failed to archive notifications', error, { ids });
      debug.groupEnd();
      throw error;
    }
  };

  const updateDelivery = (
    notificationId: string,
    channel: Channels,
    delivery:
      | DeliveryOptionsForEmail
      | DeliveryOptionsForInappWeb
      | BaseDeliveryOptions,
    subNotificationId?: string
  ) => {
    debug.log('Updating single delivery preference', {
      notificationId,
      channel,
      delivery,
      subNotificationId
    });

    return updateDeliveries([
      {
        notificationId,
        channel,
        delivery,
        subNotificationId
      }
    ]);
  };

  const updateDeliveries = (
    params: {
      notificationId: string;
      channel: Channels;
      delivery:
        | DeliveryOptionsForEmail
        | DeliveryOptionsForInappWeb
        | BaseDeliveryOptions;
      subNotificationId?: string;
    }[]
  ) => {
    debug.group('Updating delivery preferences');
    debug.log('Preference updates', { count: params.length, params });

    try {
      client.rest
        .postPreferences(params)
        .then(() => {
          debug.log(
            'Preferences updated successfully, fetching latest preferences'
          );
          client
            .getPreferences()
            .then((res) => {
              debug.log('Latest preferences fetched', {
                preferencesCount: res.preferences?.length || 0,
                notificationsCount: res.notifications?.length || 0,
                subNotificationsCount: res.subNotifications?.length || 0
              });
              setPreferences(res);
              debug.groupEnd();
            })
            .catch((error) => {
              debug.error('Failed to fetch updated preferences', error);
              debug.groupEnd();
            });
        })
        .catch((error) => {
          debug.error('Failed to update preferences', error, { params });
          debug.groupEnd();
        });
    } catch (error) {
      debug.error('Error in updateDeliveries', error, { params });
      debug.groupEnd();
      throw error;
    }
  };

  useEffect(() => {
    debug.group('Provider initialization effect');
    debug.log('Resetting state and loading initial data');

    // reset state
    setNotifications([]);
    setLoadingNotifications(false);
    setPreferences(undefined);
    setOldestLoaded(new Date().toISOString());
    setHasMore(true);

    loadNotifications(true);

    debug.log('Opening WebSocket connection');
    client.openWebSocket();

    debug.log('Fetching user preferences');
    client
      .getPreferences()
      .then((res) => {
        debug.log('Initial preferences loaded', {
          preferencesCount: res.preferences?.length || 0,
          notificationsCount: res.notifications?.length || 0,
          subNotificationsCount: res.subNotifications?.length || 0
        });
        setPreferences(res);
        debug.groupEnd();
      })
      .catch((error) => {
        debug.error('Failed to fetch initial preferences', error);
        debug.groupEnd();
      });
  }, [client, loadNotifications, debug]);

  useEffect(() => {
    debug.group('Fetching user account metadata');
    client
      .getUserAccountMetadata()
      .then((res) => {
        debug.log('User account metadata loaded', {
          hasLogo: !!res.userAccountMetadata?.logo
        });
        setUserAccountMetaData(res);
        debug.groupEnd();
      })
      .catch((error) => {
        debug.error('Failed to fetch user account metadata', error);
        debug.groupEnd();
      });
  }, [client, debug]);

  const value: Context = {
    notifications,
    preferences,
    userAccountMetaData,
    loadNotifications,
    markAsOpened,
    markAsArchived,
    markAsUnarchived,
    markAsClicked,
    updateDelivery,
    updateDeliveries,
    getClient: () => client
  };

  debug.log('NotificationAPI Provider rendering', {
    notificationsCount: notifications?.length || 0,
    hasPreferences: !!preferences,
    hasUserAccountMetaData: !!userAccountMetaData
  });

  // Create MUI theme from theme prop
  const muiTheme = useMemo(() => {
    if (props.theme) {
      return createNotificationAPITheme(props.theme);
    }
    return createNotificationAPITheme('light'); // Default to light theme
  }, [props.theme]);

  return (
    <ThemeProvider theme={muiTheme}>
      <NotificationAPIContext.Provider value={value}>
        {props.children}
      </NotificationAPIContext.Provider>
    </ThemeProvider>
  );
};

const useNotificationAPIContext = (): Context => {
  const context = useContext(NotificationAPIContext);
  if (!context) {
    throw new Error('useMyContext must be used within a MyProvider');
  }
  return context;
};
NotificationAPIProvider.useNotificationAPIContext = useNotificationAPIContext;
