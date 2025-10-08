import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  ActivityIndicator,
  Text,
} from 'react-native-paper';
import { useQuery } from 'react-query';
import apiService from '../services/api';
import { TimeEntry, Topic } from '../types';

const TimeEntriesScreen: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: timeEntries = [], isLoading } = useQuery(
    ['timeEntries', selectedDate],
    () => apiService.getTimeEntries(selectedDate, selectedDate)
  );

  const { data: topics = [] } = useQuery('topics', apiService.getTopics);

  const getTopicById = (topicId: number): Topic | undefined => {
    return topics.find(topic => topic.id === topicId);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTimeEntry = ({ item }: { item: TimeEntry }) => {
    const topic = getTopicById(item.topic_id);
    const duration = item.duration || 0;

    return (
      <Card style={styles.entryCard}>
        <Card.Content>
          <View style={styles.entryHeader}>
            <View style={styles.topicInfo}>
              {topic && (
                <Chip
                  mode="flat"
                  style={[styles.topicChip, { backgroundColor: topic.color + '20' }]}
                  textStyle={{ color: topic.color }}
                >
                  {topic.name}
                </Chip>
              )}
            </View>
            <Text style={styles.durationText}>
              {formatDuration(duration)}
            </Text>
          </View>
          
          <View style={styles.timeInfo}>
            <Text style={styles.timeText}>
              {formatTime(item.start_time)}
              {item.end_time && ` - ${formatTime(item.end_time)}`}
            </Text>
          </View>
          
          {item.description && (
            <Paragraph style={styles.descriptionText}>
              {item.description}
            </Paragraph>
          )}
        </Card.Content>
      </Card>
    );
  };

  const totalTime = timeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.summaryTitle}>סיכום היום</Title>
            <Text style={styles.totalTime}>
              {formatDuration(totalTime)}
            </Text>
            <Paragraph style={styles.entriesCount}>
              {timeEntries.length} רשומות זמן
            </Paragraph>
          </Card.Content>
        </Card>

        {isLoading ? (
          <ActivityIndicator style={styles.loading} />
        ) : timeEntries.length > 0 ? (
          <FlatList
            data={timeEntries}
            renderItem={renderTimeEntry}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.entriesList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Title style={styles.emptyTitle}>אין רשומות זמן</Title>
              <Paragraph style={styles.emptyText}>
                התחל לעקוב אחר הזמן שלך עם הטיימר
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
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
  summaryCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
  },
  summaryTitle: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
  },
  totalTime: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
  },
  entriesCount: {
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
  },
  loading: {
    marginVertical: 32,
  },
  entriesList: {
    gap: 12,
  },
  entryCard: {
    elevation: 2,
    borderRadius: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  topicInfo: {
    flex: 1,
  },
  topicChip: {
    alignSelf: 'flex-start',
  },
  durationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  timeInfo: {
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#64748b',
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  emptyCard: {
    elevation: 2,
    borderRadius: 12,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
  },
});

export default TimeEntriesScreen;


