import React, { useContext, useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { ActionButton, Card, Header, Screen } from '../../components/AppUI';
import { colors } from '../../constants/theme';

export default function Profile({ navigation }: any) {
  const { user, logout, updateProfile } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
  }, [user?.name, user?.email]);

  const saveProfile = async () => {
    if (!name.trim() || !email.trim()) return;
    await updateProfile(name.trim(), email.trim());
    setEditing(false);
  };

  return (
    <Screen scroll>
      <Header eyebrow="ACCOUNT" title="Your profile" subtitle="Manage your account, resume access, and workspace settings." />
      <Card style={{ marginTop: 0, backgroundColor: colors.ink, borderColor: colors.ink, borderRadius: 8 }}>
        <View style={{ width: 58, height: 58, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{(user?.name || 'A').trim().charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={{ color: '#9db5d3', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 16 }}>APPLICANT ACCOUNT</Text>
        {!editing ? (
          <>
            <Text style={{ color: '#fff', fontSize: 23, fontWeight: '800', marginTop: 7 }}>{user?.name || 'Applicant'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 7 }}>
              <Ionicons name="mail-outline" size={15} color="#9db5d3" />
              <Text style={{ color: '#b9cce3', fontSize: 14, marginLeft: 7 }}>{user?.email || 'No email available'}</Text>
            </View>
          </>
        ) : (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#dfe9f9', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>Name</Text>
            <TextInput accessibilityLabel="Name" value={name} onChangeText={setName} autoComplete="name" returnKeyType="next" placeholder="Your full name" placeholderTextColor="#8795a8" style={styles.input} />
            <Text style={{ color: '#dfe9f9', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>Email</Text>
            <TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoCorrect={false} returnKeyType="done" placeholder="you@example.com" placeholderTextColor="#8795a8" style={styles.input} />
          </View>
        )}
      </Card>

      <Card>
        <Text style={{ color: '#12233f', fontSize: 16, fontWeight: '800' }}>{editing ? 'Update your details' : 'Personal details'}</Text>
        <Text style={{ color: '#52627a', fontSize: 13, lineHeight: 20, marginTop: 5 }}>
          {editing ? 'Keep your account information up to date.' : 'Your details are used to personalize your workspace.'}
        </Text>
        <View style={{ marginTop: 14 }}>
          {editing ? (
            <ActionButton title="Save changes" icon="checkmark-done-outline" onPress={saveProfile} disabled={!name.trim() || !email.trim()} />
          ) : (
            <ActionButton title="Edit profile" icon="create-outline" onPress={() => setEditing(true)} />
          )}
        </View>
        {editing ? (
          <View style={{ marginTop: 10 }}>
            <ActionButton title="Cancel" icon="close-outline" secondary onPress={() => { setEditing(false); setName(user?.name || ''); setEmail(user?.email || ''); }} />
          </View>
        ) : null}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.sessionIcon}><Ionicons name="shield-checkmark-outline" size={19} color="#167044" /></View>
          <Text style={{ color: '#12233f', fontSize: 16, fontWeight: '800', marginLeft: 11 }}>Your account is private</Text>
        </View>
        <Text style={{ color: '#52627a', lineHeight: 21, marginTop: 10 }}>Your resume and interview results are linked to your account and are not shown to other applicants.</Text>
        <View style={{ marginTop: 16 }}><ActionButton title="Sign out" icon="log-out-outline" secondary onPress={logout} /></View>
      </Card>

      {user?.is_admin ? (
        <View style={{ marginTop: 12 }}>
          <ActionButton title="Open admin dashboard" icon="shield-checkmark-outline" secondary onPress={() => navigation.navigate('AdminResumes')} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = {
  input: { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 13, paddingVertical: 12, color: colors.ink, marginBottom: 13, minHeight: 48 },
  sessionIcon: { width: 38, height: 38, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.accentSoft },
};
