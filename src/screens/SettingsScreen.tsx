import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  List,
  Switch,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';

const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'התנתקות',
      'האם אתה בטוח שברצונך להתנתק?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התנתק',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info */}
      <Card style={styles.userCard}>
        <Card.Content>
          <Title style={styles.userName}>{user?.display_name || user?.username}</Title>
          <Paragraph style={styles.userEmail}>{user?.email}</Paragraph>
        </Card.Content>
      </Card>

      {/* App Settings */}
      <Card style={styles.settingsCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>הגדרות אפליקציה</Title>
          
          <List.Item
            title="התראות"
            description="קבל התראות על סיום טיימר"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => <Switch value={true} onValueChange={() => {}} />}
          />
          
          <Divider />
          
          <List.Item
            title="שמירה אוטומטית"
            description="שמור נתונים אוטומטית"
            left={(props) => <List.Icon {...props} icon="content-save" />}
            right={() => <Switch value={true} onValueChange={() => {}} />}
          />
          
          <Divider />
          
          <List.Item
            title="מצב לילה"
            description="השתמש במצב לילה"
            left={(props) => <List.Icon {...props} icon="weather-night" />}
            right={() => <Switch value={false} onValueChange={() => {}} />}
          />
        </Card.Content>
      </Card>

      {/* Data Management */}
      <Card style={styles.dataCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>ניהול נתונים</Title>
          
          <List.Item
            title="ייצא נתונים"
            description="ייצא את כל הנתונים שלך"
            left={(props) => <List.Icon {...props} icon="download" />}
            onPress={() => Alert.alert('ייצוא', 'פונקציה זו תהיה זמינה בקרוב')}
          />
          
          <Divider />
          
          <List.Item
            title="גיבוי נתונים"
            description="צור גיבוי של הנתונים"
            left={(props) => <List.Icon {...props} icon="backup-restore" />}
            onPress={() => Alert.alert('גיבוי', 'פונקציה זו תהיה זמינה בקרוב')}
          />
        </Card.Content>
      </Card>

      {/* About */}
      <Card style={styles.aboutCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>אודות</Title>
          
          <List.Item
            title="גרסה"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
          
          <Divider />
          
          <List.Item
            title="תמיכה"
            description="צור קשר לתמיכה טכנית"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            onPress={() => Alert.alert('תמיכה', 'support@timetrackpro.com')}
          />
        </Card.Content>
      </Card>

      {/* Logout */}
      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        buttonColor="#ef4444"
        contentStyle={styles.logoutButtonContent}
      >
        התנתק
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  userCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
  },
  userName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userEmail: {
    color: 'white',
    opacity: 0.9,
  },
  settingsCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  dataCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  aboutCard: {
    marginBottom: 24,
    elevation: 2,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logoutButton: {
    borderRadius: 8,
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
});

export default SettingsScreen;


