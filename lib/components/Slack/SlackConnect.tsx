import { useContext, useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Autocomplete,
  TextField,
  Paper
} from '@mui/material';
import { NotificationAPIContext } from '../Provider/context';
import { User } from '@notificationapi/core/dist/interfaces';

interface SlackChannel {
  id: string;
  name: string;
  type: 'channel' | 'user';
}

interface SlackConnectProps {
  description?: string;
  connectButtonText?: string;
  editButtonText?: string;
  disconnectButtonText?: string;
  saveButtonText?: string;
  cancelButtonText?: string;
  connectedText?: string;
  selectChannelText?: string;
  /**
   * Controls what type of Slack destination the user can select:
   * - 'me': Only allows sending to the authenticated user's own DM (no channel picker or edit option)
   * - 'any': Allows selecting any channel or user (default behavior)
   */
  destinationType?: 'me' | 'any';
}

export function SlackConnect({
  description = 'Connect your Slack workspace to receive notifications directly in Slack.',
  connectButtonText = 'Connect Slack',
  editButtonText = 'Edit Channel',
  disconnectButtonText = 'Disconnect',
  saveButtonText = 'Save',
  cancelButtonText = 'Cancel',
  connectedText = 'Slack notifications will be sent to:',
  selectChannelText = 'Choose a channel or user to receive notifications:',
  destinationType = 'any'
}: SlackConnectProps = {}) {
  const context = useContext(NotificationAPIContext);
  const client = context?.getClient();
  const [slackToken, setSlackToken] = useState<
    User['slackToken'] | undefined
  >();
  const [slackChannel, setSlackChannel] = useState<string | undefined>();
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasMoreChannels, setHasMoreChannels] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);

  const fetchUserSlackStatus = useCallback(async () => {
    if (!client) return;

    try {
      setLoading(true);

      // Get user's current slack configuration using user.get
      const user = await client.user.get();

      if (user.slackToken) {
        setSlackToken(user.slackToken);
      }

      if (user.slackChannel) {
        setSlackChannel(user.slackChannel);
      }
    } catch (err) {
      console.error('Error fetching Slack status:', err);
      // If the endpoint doesn't exist yet, that's okay
    } finally {
      setLoading(false);
    }
  }, [client]);

  const loadChannels = useCallback(async () => {
    if (!client || !slackToken) return [];

    try {
      setLoading(true);
      setError(null);

      // Get channels and users from Slack
      const response = await client.slack.getChannels();

      // Combine channels and users into a single array
      const allOptions: SlackChannel[] = [
        ...(response.channels || [])
          .filter((c) => c.id && c.name)
          .map((c) => ({
            id: c.id!,
            name: c.name!,
            type: 'channel' as SlackChannel['type']
          })),
        ...(response.users || [])
          .filter((u) => u.id && u.name)
          .map((u) => ({
            id: u.id!,
            name: u.name!,
            type: 'user' as SlackChannel['type']
          }))
      ];

      setHasMoreChannels(response.hasMoreChannels || false);
      setHasMoreUsers(response.hasMoreUsers || false);

      setChannels(allOptions);
      return allOptions;
    } catch (err) {
      console.error('Error loading channels and users:', err);
      setError('Failed to load Slack channels and users. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [client, slackToken]);

  useEffect(() => {
    // Fetch the user's current slackToken and slackChannel from the API
    fetchUserSlackStatus();
  }, [fetchUserSlackStatus]);

  useEffect(() => {
    if (slackToken && !slackChannel && !isEditing) {
      if (destinationType === 'me') {
        // Auto-set DM for 'me' mode
        const autoSetDirectMessage = async () => {
          try {
            setLoading(true);
            setError(null);

            // Get the current Slack user's info
            const response = await client?.slack.getChannels();

            // Use the authenticated user from the response
            const currentUser = response?.me;

            if (currentUser && currentUser.name && client) {
              // Set the channel to the current user's DM
              const formattedChannel = `@${currentUser.name}`;
              await client.slack.setChannel(formattedChannel);
              setSlackChannel(formattedChannel);
            } else {
              setError(
                'Unable to automatically set direct message. Please try again.'
              );
            }
          } catch (err) {
            console.error('Error setting direct message:', err);
            setError('Failed to set direct message. Please try again.');
          } finally {
            setLoading(false);
          }
        };
        autoSetDirectMessage();
      } else {
        // Load channels for 'any' mode
        loadChannels();
      }
    }
  }, [
    slackToken,
    slackChannel,
    isEditing,
    loadChannels,
    destinationType,
    client
  ]);

  const handleConnectSlack = async () => {
    if (!client) return;

    try {
      setLoading(true);
      setError(null);

      // Generate Slack OAuth URL
      const url = await client.slack.getOAuthUrl();

      // Redirect to Slack OAuth
      window.location.href = url;
    } catch (err) {
      console.error('Error connecting to Slack:', err);
      setError('Failed to connect to Slack. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChannel = async () => {
    if (!client || !selectedChannel) return;

    try {
      setLoading(true);
      setError(null);

      let formattedChannel: string;
      const trimmedValue = selectedChannel.trim();
      const isSlackId = /^[CDGUWTE][A-Z0-9]{8,}$/i.test(trimmedValue);

      // Check if selectedChannel is an ID or a name already in our list
      const channelInfo = channels.find(
        (c) =>
          c.id === trimmedValue ||
          c.name.toLowerCase() === trimmedValue.toLowerCase()
      );

      if (channelInfo) {
        // If we found it in the list, use the formatted name (#channel or @user)
        formattedChannel = `${channelInfo.type === 'channel' ? '#' : '@'}${channelInfo.name}`;
      } else if (
        trimmedValue.startsWith('#') ||
        trimmedValue.startsWith('@') ||
        isSlackId
      ) {
        // User typed a custom value with proper prefix or a Slack ID
        formattedChannel = trimmedValue;
      } else {
        // Invalid format - show error
        setError(
          'Please enter a #channel-name, @username, or a Slack ID (e.g. C12345678)'
        );
        setLoading(false);
        return;
      }

      // Set the selected channel with formatted name
      await client.slack.setChannel(formattedChannel);

      setSlackChannel(formattedChannel);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Error saving channel:', err);
      setError('Failed to save channel. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!client) return;

    try {
      setLoading(true);
      setError(null);

      // Remove slackToken and slackChannel using identify
      await client.identify({
        // @ts-expect-error - null is not assignable to type string
        slackToken: null,
        // @ts-expect-error - null is not assignable to type string
        slackChannel: null
      });

      setSlackToken(undefined);
      setSlackChannel(undefined);
      setSelectedChannel('');
      setChannels([]);
      setIsEditing(false);
    } catch (err) {
      console.error('Error disconnecting Slack:', err);
      setError('Failed to disconnect Slack. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    setIsEditing(true);

    // Load channels if not already loaded
    let channelsList = channels;
    if (channels.length === 0) {
      channelsList = await loadChannels();
    }

    // Parse the slackChannel to find the matching channel ID
    if (slackChannel) {
      const isSlackId = /^[CDGUWTE][A-Z0-9]{8,}$/i.test(slackChannel);

      if (isSlackId) {
        setSelectedChannel(slackChannel);
      } else if (slackChannel.startsWith('#') || slackChannel.startsWith('@')) {
        const isChannel = slackChannel.startsWith('#');
        const channelName = slackChannel.substring(1); // Remove # or @
        const channelType = isChannel ? 'channel' : 'user';

        // Find the channel ID that matches the name and type
        const matchingChannel = channelsList.find(
          (c) => c.name === channelName && c.type === channelType
        );

        if (matchingChannel) {
          setSelectedChannel(matchingChannel.id);
        } else {
          // Channel not found in list (possibly due to pagination)
          // Set the formatted channel string directly for freeSolo mode
          setSelectedChannel(slackChannel);
        }
      } else {
        setSelectedChannel(slackChannel);
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedChannel('');
  };

  if (!client) {
    return null;
  }

  // Show loading state
  if (loading && !slackToken && !channels.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  // No Slack token - show connect button
  if (!slackToken) {
    return (
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConnectSlack}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : connectButtonText}
          </Button>
        </Stack>
      </Box>
    );
  }

  // For 'me' mode, show loading while auto-setting DM
  if (destinationType === 'me' && slackToken && !slackChannel) {
    return (
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  // Has token but no channel (or editing)
  // Don't show channel picker for 'me' mode - it auto-sets
  if ((!slackChannel || isEditing) && destinationType === 'any') {
    return (
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {selectChannelText}
            </Typography>
            <Autocomplete
              disablePortal
              freeSolo
              id="slack-channel-select"
              slots={{
                paper: ({ children, ...props }) => (
                  <Paper {...props}>
                    {children && (hasMoreChannels || hasMoreUsers) && (
                      <Typography
                        variant="body2"
                        color="info.main"
                        sx={{
                          px: 2,
                          py: 1,
                          display: 'block',
                          borderBottom: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        {hasMoreChannels && hasMoreUsers
                          ? 'Not all channels and users could be loaded.'
                          : hasMoreChannels
                            ? 'Not all channels could be loaded.'
                            : 'Not all users could be loaded.'}{' '}
                        Type #channel-name or @username to enter manually.
                      </Typography>
                    )}
                    {children}
                  </Paper>
                )
              }}
              options={channels.sort((a, b) => {
                if (a.type === b.type) {
                  return a.name.localeCompare(b.name);
                }
                return a.type === 'channel' ? -1 : 1;
              })}
              groupBy={(option) =>
                typeof option === 'string'
                  ? ''
                  : option.type === 'channel'
                    ? 'Channels'
                    : 'Users'
              }
              getOptionLabel={(option) =>
                typeof option === 'string'
                  ? option
                  : `${option.type === 'channel' ? '#' : '@'}${option.name}`
              }
              sx={{ minWidth: 200, flexGrow: 1 }}
              size="small"
              value={
                channels.find((c) => c.id === selectedChannel) ||
                selectedChannel ||
                null
              }
              onChange={(_, newValue) => {
                if (typeof newValue === 'string') {
                  setSelectedChannel(newValue);
                } else if (newValue) {
                  setSelectedChannel(newValue.id);
                } else {
                  setSelectedChannel('');
                }
              }}
              onInputChange={(_, newInputValue, reason) => {
                if (reason === 'input') {
                  setSelectedChannel(newInputValue);
                }
              }}
              isOptionEqualToValue={(option, value) => {
                if (typeof option === 'string' || typeof value === 'string') {
                  return option === value;
                }
                return option.id === value.id;
              }}
              renderInput={(params) => (
                <TextField {...params} label="Channel or User" />
              )}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveChannel}
              disabled={!selectedChannel || loading}
            >
              {saveButtonText}
            </Button>
            {isEditing && (
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
                disabled={loading}
              >
                {cancelButtonText}
              </Button>
            )}
            <Button
              variant="text"
              color="error"
              onClick={handleDisconnect}
              disabled={loading}
              size="small"
            >
              {disconnectButtonText}
            </Button>
          </Stack>
        )}
      </Box>
    );
  }

  // Has both token and channel - show connected state
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography variant="body2" color="text.secondary">
        {connectedText}
      </Typography>
      <Typography variant="body1" fontWeight="medium">
        {slackChannel}
      </Typography>
      {destinationType === 'any' && (
        <Button variant="outlined" onClick={handleEdit} disabled={loading}>
          {editButtonText}
        </Button>
      )}
      <Button
        variant="text"
        color="error"
        onClick={handleDisconnect}
        disabled={loading}
      >
        {disconnectButtonText}
      </Button>
    </Stack>
  );
}
