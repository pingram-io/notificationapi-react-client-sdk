import React, { useState, Component, ErrorInfo } from 'react';
import {
  NotificationFeed,
  NotificationPopup,
  NotificationLauncher,
  NotificationCounter,
  NotificationAPIProvider,
  NotificationPreferencesPopup,
  NotificationPreferencesInline
} from '../lib/main';
import {
  Button,
  Divider,
  TextField,
  Grid2,
  Alert,
  Switch,
  FormControlLabel
} from '@mui/material';

interface LiveComponentsProps {
  isMocked: boolean;
  setIsMocked: (isMocked: boolean) => void;
}

class ErrorBoundary extends Component<{
  children: React.ReactNode;
  key: string;
}> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <Alert severity="error" sx={{ margin: 2 }}>
          {this.state.error.message}
        </Alert>
      );
    }

    return this.props.children;
  }
}

const LiveComponents: React.FC<LiveComponentsProps> = ({
  isMocked,
  setIsMocked
}) => {
  const [clientId, setClientId] = useState('24nojpnrsdc53fkslha0roov05');
  const [userId, setUserId] = useState('sahand');
  const [apiUrl, setApiUrl] = useState('api.pingram.io');
  const [debugMode, setDebugMode] = useState(true);
  const [error] = useState<string | null>(null);
  const [preferencesPopupVisibility, setPreferencesPopupVisiblity] =
    useState(false);

  const handleInputChange =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
    };

  return (
    <>
      <Grid2
        container
        justifyContent={'space-between'}
        sx={{ paddingX: 3, paddingTop: 1 }}
      >
        <Grid2 container spacing={2}>
          <TextField
            label="Client ID"
            defaultValue={clientId}
            onChange={handleInputChange(setClientId)}
            variant="outlined"
            size="small"
          />
          <TextField
            label="User ID"
            defaultValue={userId}
            onChange={handleInputChange(setUserId)}
            variant="outlined"
            size="small"
          />
          <TextField
            label="API URL"
            defaultValue={apiUrl}
            onChange={handleInputChange(setApiUrl)}
            variant="outlined"
            size="small"
          />
          <FormControlLabel
            control={
              <Switch
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                color="primary"
              />
            }
            label="🐛 Debug Mode"
          />
        </Grid2>

        <Grid2 container>
          <Button
            onClick={() => setIsMocked(!isMocked)}
            variant="contained"
            color="primary"
          >
            {isMocked ? '🔴 Mocked' : '🟢 Live'} - Switch to{' '}
            {isMocked ? 'Live' : 'Mocked'} Mode
          </Button>
        </Grid2>
      </Grid2>
      {error && (
        <Alert severity="error" sx={{ margin: 2 }}>
          {error}
        </Alert>
      )}
      {debugMode && (
        <Alert severity="info" sx={{ margin: 2 }}>
          🐛 Debug mode is enabled! Check the browser console for detailed logs.
        </Alert>
      )}
      <div
        style={{
          padding: 24
        }}
      >
        <ErrorBoundary key={`${clientId}-${userId}-${apiUrl}-${debugMode}`}>
          <NotificationAPIProvider
            clientId={clientId}
            userId={userId}
            apiURL={apiUrl}
            playSoundOnNewNotification={true}
            debug={debugMode}
          >
            <h2>Popup:</h2>
            <NotificationPopup />

            <Divider />

            <h2>Launcher:</h2>
            <p>Look at the bottom right :)</p>
            <NotificationLauncher
              buttonStyles={{ backgroundColor: '#000' }}
              iconColor="white"
            />

            <Divider />

            <h2>Counter (Standalone)</h2>
            <NotificationCounter />

            <Divider />

            <h2>Counter on an element</h2>
            <NotificationCounter
              count={(n) => {
                return n.notificationId === 'conversion_failure' && !n.archived;
              }}
            >
              <Button variant="contained" color="primary">
                Button
              </Button>
            </NotificationCounter>

            <Divider sx={{ marginTop: 3 }} />

            <h2>Feed:</h2>
            <NotificationFeed infiniteScrollHeight={300} />

            <Divider sx={{ marginTop: 3 }} />

            <h2>Preferences Popup:</h2>
            <Button
              onClick={() => setPreferencesPopupVisiblity(true)}
              variant="contained"
              color="primary"
            >
              Preferences Popup
            </Button>
            <NotificationPreferencesPopup
              open={preferencesPopupVisibility}
              onClose={() => {
                setPreferencesPopupVisiblity(false);
              }}
            />

            <Divider sx={{ marginTop: 3 }} />

            <h2>Preferences Inline:</h2>
            <NotificationPreferencesInline />

            <Divider sx={{ marginTop: 3 }} />
          </NotificationAPIProvider>
        </ErrorBoundary>
      </div>
    </>
  );
};

export default LiveComponents;
