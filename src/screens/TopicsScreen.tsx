import React, { useState } from 'react';
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
  TextInput,
  FAB,
  Chip,
  ActivityIndicator,
  Portal,
  Modal,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import apiService from '../services/api';
import { Topic } from '../types';

const TopicsScreen: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicColor, setNewTopicColor] = useState('#3b82f6');
  const queryClient = useQueryClient();

  const { data: topics = [], isLoading } = useQuery(
    'topics',
    apiService.getTopics
  );

  const createTopicMutation = useMutation(
    ({ name, color }: { name: string; color: string }) =>
      apiService.createTopic(name, color),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('topics');
        setShowAddModal(false);
        setNewTopicName('');
        setNewTopicColor('#3b82f6');
      },
      onError: () => {
        Alert.alert('שגיאה', 'לא ניתן ליצור נושא חדש');
      },
    }
  );

  const deleteTopicMutation = useMutation(
    (id: number) => apiService.deleteTopic(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('topics');
      },
      onError: () => {
        Alert.alert('שגיאה', 'לא ניתן למחוק נושא');
      },
    }
  );

  const handleAddTopic = () => {
    if (newTopicName.trim()) {
      createTopicMutation.mutate({
        name: newTopicName.trim(),
        color: newTopicColor,
      });
    }
  };

  const handleDeleteTopic = (topic: Topic) => {
    Alert.alert(
      'מחיקת נושא',
      `האם אתה בטוח שברצונך למחוק את הנושא "${topic.name}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => deleteTopicMutation.mutate(topic.id),
        },
      ]
    );
  };

  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#06b6d4', '#84cc16',
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.title}>נושאים</Title>
            <Paragraph style={styles.subtitle}>
              נהל את הנושאים שלך לעקיבה אחר זמן
            </Paragraph>
          </Card.Content>
        </Card>

        {isLoading ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          <View style={styles.topicsGrid}>
            {topics.map((topic) => (
              <Card key={topic.id} style={styles.topicCard}>
                <Card.Content style={styles.topicContent}>
                  <View style={styles.topicHeader}>
                    <View style={[styles.colorIndicator, { backgroundColor: topic.color }]} />
                    <Title style={styles.topicName}>{topic.name}</Title>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={() => handleDeleteTopic(topic)}
                    style={styles.deleteButton}
                    textColor="#ef4444"
                  >
                    מחק
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      />

      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={() => setShowAddModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>הוסף נושא חדש</Title>
          
          <TextInput
            label="שם הנושא"
            value={newTopicName}
            onChangeText={setNewTopicName}
            mode="outlined"
            style={styles.input}
          />

          <Paragraph style={styles.colorLabel}>בחר צבע:</Paragraph>
          <View style={styles.colorGrid}>
            {colors.map((color) => (
              <Chip
                key={color}
                selected={newTopicColor === color}
                onPress={() => setNewTopicColor(color)}
                style={[
                  styles.colorChip,
                  { backgroundColor: color + '20' },
                  newTopicColor === color && { backgroundColor: color }
                ]}
              />
            ))}
          </View>

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setShowAddModal(false)}
              style={styles.modalButton}
            >
              ביטול
            </Button>
            <Button
              mode="contained"
              onPress={handleAddTopic}
              disabled={!newTopicName.trim() || createTopicMutation.isLoading}
              style={styles.modalButton}
            >
              {createTopicMutation.isLoading ? 'יוצר...' : 'הוסף'}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
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
  headerCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 4,
  },
  loading: {
    marginVertical: 32,
  },
  topicsGrid: {
    gap: 12,
  },
  topicCard: {
    elevation: 2,
    borderRadius: 12,
  },
  topicContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  topicName: {
    fontSize: 16,
    flex: 1,
  },
  deleteButton: {
    borderColor: '#ef4444',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3b82f6',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  colorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  colorChip: {
    margin: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});

export default TopicsScreen;


