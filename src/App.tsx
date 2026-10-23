import { AuthScreen } from './auth/AuthScreen';
import { useAuth } from './auth/useAuth';
import { Workspace } from './Workspace';

export function App() {
  const auth = useAuth();

  return (
    <div className="app-container">
      {auth.phase === 'signedIn' && auth.user ? (
        <Workspace key={auth.user.id} user={auth.user} onSignOut={auth.signOut} />
      ) : (
        <AuthScreen
          key={auth.phase}
          phase={auth.phase}
          notice={auth.notice}
          setNotice={auth.setNotice}
          signIn={auth.signIn}
          signUp={auth.signUp}
          forgotPassword={auth.forgotPassword}
          savePassword={auth.savePassword}
          cancelRecovery={auth.cancelRecovery}
        />
      )}
    </div>
  );
}
