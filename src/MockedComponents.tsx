import React, { useState } from 'react';
import {
  NotificationFeed,
  NotificationPopup,
  NotificationLauncher,
  NotificationCounter,
  NotificationAPIProvider,
  NotificationPreferencesPopup,
  NotificationPreferencesInline
} from '../lib/main';
import { FakeNotification } from './FakeNotification';
import { InAppNotification } from '@notificationapi/core/dist/interfaces';
import { getMockedClient } from './mockedClient';
import { Button, Divider, Grid2 } from '@mui/material';

interface MockedComponentsProps {
  isMocked: boolean;
  setIsMocked: (isMocked: boolean) => void;
}

const MockedComponents: React.FC<MockedComponentsProps> = ({
  isMocked,
  setIsMocked
}) => {
  const [preferencesPopupVisibility, setPreferencesPopupVisiblity] =
    useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  return (
    <>
      <NotificationAPIProvider
        clientId="24nojpnrc53fkslha0roov05"
        user={{
          id: 'mockedUser',
          email: 'mockedUser@gmail.com'
        }}
        client={getMockedClient(
          '24nojpnrsdc53fha0roov05',
          'mockedUser',
          notifications
        )}
      >
        <Grid2
          container
          justifyContent={'space-between'}
          sx={{ paddingX: 3, paddingTop: 1 }}
        >
          <Grid2 container>
            <FakeNotification
              addToState={(notification: InAppNotification) => {
                setNotifications([...notifications, notification]);
              }}
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
        <div
          style={{
            padding: 24
          }}
        >
          <h2>Popup:</h2>
          <NotificationPopup
            count={(n) => {
              return !n.archived;
            }}
            pagination="PAGINATED"
          />

          <Divider />

          <h2>Launcher:</h2>
          <p>Look at the bottom right :)</p>
          <NotificationLauncher
            count={(n) => {
              return !n.archived;
            }}
            buttonStyles={{ backgroundColor: '#000' }}
            iconColor="white"
          />

          <Divider />

          <h2>Counter (Standalone)</h2>
          <NotificationCounter
            count={(n) => {
              return !n.archived;
            }}
          />

          <Divider />

          <h2>Counter on an element</h2>
          <NotificationCounter
            count={(n) => {
              return !n.archived;
            }}
          >
            <Button variant="contained" color="primary">
              Button
            </Button>
          </NotificationCounter>
          <Divider sx={{ marginTop: 3 }} />
          <h2>Feed:</h2>
          <NotificationFeed infiniteScrollHeight={300} pagination="PAGINATED" />

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

          <h2>Preferences Inline:</h2>
          <NotificationPreferencesInline />
        </div>
      </NotificationAPIProvider>
    </>
  );
};

export default MockedComponents;
