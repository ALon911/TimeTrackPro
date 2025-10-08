import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { useTimer } from '../hooks/useTimer';
import { useQuery } from 'react-query';
import apiService from '../services/api';
import { Topic } from '../types';

const { width } = Dimensions.get('window');

const TimerScreen: React.FC = () => {
  const { timerState, startTimer, stopTimer, formatDuration, isStarting, isStopping } = useTimer();
  
  const { data: topics = [], isLoading: topicsLoading } = useQuery(
    'topics',
    apiService.getTopics
  );

  const handleStartTimer = (topic: Topic) => {
    startTimer(topic);
  };

  const handleStopTimer = () => {
    stopTimer();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Timer Display */}
      <Card style={styles.timerCard}>
        <Card.Content style={styles.timerContent}>
          <Surface style={styles.timerCircle} elevation={4}>
            <Title style={styles.timerText}>
              {formatDuration(timerState.duration)}
            </Title>
            {timerState.currentTopic && (
              <Paragraph style={styles.topicText}>
                {timerState.currentTopic.name}
              </Paragraph>
            )}
          </Surface>
        </Card.Content>
      </Card>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {timerState.isRunning ? (
          <Button
            mode="contained"
            onPress={handleStopTimer}
            style={[styles.controlButton, styles.stopButton]}
            contentStyle={styles.buttonContent}
            disabled={isStopping}
          >
            {isStopping ? (
              <ActivityIndicator color="white" />
            ) : (
              'עצור טיימר'
            )}
          </Button>
        ) : (
          <Paragraph style={styles.instructionText}>
            בחר נושא והתחל לעקוב אחר הזמן
          </Paragraph>
        )}
      </View>

      {/* Topics */}
      <Card style={styles.topicsCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>נושאים</Title>
          {topicsLoading ? (
            <ActivityIndicator style={styles.loading} />
          ) : (
            <View style={styles.topicsGrid}>
              {topics.map((topic) => (
                <Chip
                  key={topic.id}
                  mode={timerState.currentTopic?.id === topic.id ? 'flat' : 'outlined'}
                  selected={timerState.currentTopic?.id === topic.id}
                  onPress={() => !timerState.isRunning && handleStartTimer(topic)}
                  style={[
                    styles.topicChip,
                    { backgroundColor: topic.color + '20' },
                    timerState.currentTopic?.id === topic.id && { backgroundColor: topic.color }
                  ]}
                  textStyle={[
                    styles.topicText,
                    timerState.currentTopic?.id === topic.id && { color: 'white' }
                  ]}
                  disabled={timerState.isRunning}
                >
                  {topic.name}
                </Chip>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
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
  timerCard: {
    marginBottom: 24,
    elevation: 4,
    borderRadius: 16,
  },
  timerContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  timerCircle: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: (width * 0.6) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  topicText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 8,
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  controlButton: {
    borderRadius: 25,
    minWidth: 200,
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  buttonContent: {
    paddingVertical: 12,
  },
  instructionText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
    marginVertical: 16,
  },
  topicsCard: {
    elevation: 2,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  topicChip: {
    margin: 4,
  },
  loading: {
    marginVertical: 32,
  },
});

export default TimerScreen;


