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
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { useQuery } from 'react-query';
import { LineChart, BarChart } from 'react-native-chart-kit';
import apiService from '../services/api';
import { useTimer } from '../hooks/useTimer';

const { width } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const { timerState, formatDuration } = useTimer();
  
  // Get today's time entries
  const { data: todayEntries = [], isLoading: todayLoading } = useQuery(
    'todayEntries',
    () => {
      const today = new Date().toISOString().split('T')[0];
      return apiService.getTimeEntries(today, today);
    }
  );

  // Get this week's time entries
  const { data: weekEntries = [], isLoading: weekLoading } = useQuery(
    'weekEntries',
    () => {
      const today = new Date();
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
      const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      
      return apiService.getTimeEntries(
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
      );
    }
  );

  // Get topics for stats
  const { data: topics = [] } = useQuery('topics', apiService.getTopics);

  // Calculate today's total time
  const todayTotal = todayEntries.reduce((total, entry) => {
    return total + (entry.duration || 0);
  }, 0);

  // Calculate topic distribution for today
  const topicStats = topics.map(topic => {
    const topicEntries = todayEntries.filter(entry => entry.topic_id === topic.id);
    const totalTime = topicEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
    return {
      name: topic.name,
      time: totalTime,
      color: topic.color,
    };
  }).filter(stat => stat.time > 0);

  // Prepare chart data
  const chartData = {
    labels: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
    datasets: [{
      data: [0, 0, 0, 0, 0, 0, 0], // You'll need to calculate daily totals
      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    }],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#3b82f6',
    },
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Current Timer Status */}
      {timerState.isRunning && (
        <Card style={styles.activeTimerCard}>
          <Card.Content>
            <Title style={styles.activeTimerTitle}>טיימר פעיל</Title>
            <Paragraph style={styles.activeTimerText}>
              {formatDuration(timerState.duration)} - {timerState.currentTopic?.name}
            </Paragraph>
          </Card.Content>
        </Card>
      )}

      {/* Today's Summary */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title style={styles.cardTitle}>סיכום היום</Title>
          <Surface style={styles.timeDisplay} elevation={2}>
            <Title style={styles.timeText}>
              {Math.floor(todayTotal / 3600)}:{(Math.floor(todayTotal / 60) % 60).toString().padStart(2, '0')}
            </Title>
            <Paragraph style={styles.timeLabel}>שעות היום</Paragraph>
          </Surface>
        </Card.Content>
      </Card>

      {/* Weekly Chart */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.cardTitle}>פעילות השבוע</Title>
          {weekLoading ? (
            <ActivityIndicator style={styles.loading} />
          ) : (
            <LineChart
              data={chartData}
              width={width - 64}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          )}
        </Card.Content>
      </Card>

      {/* Topic Distribution */}
      <Card style={styles.topicsCard}>
        <Card.Content>
          <Title style={styles.cardTitle}>התפלגות נושאים היום</Title>
          {todayLoading ? (
            <ActivityIndicator style={styles.loading} />
          ) : topicStats.length > 0 ? (
            <View style={styles.topicsList}>
              {topicStats.map((stat, index) => (
                <View key={index} style={styles.topicItem}>
                  <View style={[styles.topicColor, { backgroundColor: stat.color }]} />
                  <Paragraph style={styles.topicName}>{stat.name}</Paragraph>
                  <Paragraph style={styles.topicTime}>
                    {Math.floor(stat.time / 3600)}:{(Math.floor(stat.time / 60) % 60).toString().padStart(2, '0')}
                  </Paragraph>
                </View>
              ))}
            </View>
          ) : (
            <Paragraph style={styles.noDataText}>אין נתונים להיום</Paragraph>
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
  activeTimerCard: {
    marginBottom: 16,
    backgroundColor: '#dcfce7',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  activeTimerTitle: {
    color: '#166534',
    fontSize: 16,
  },
  activeTimerText: {
    color: '#166534',
    fontSize: 14,
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  chartCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  topicsCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeDisplay: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  timeLabel: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  loading: {
    marginVertical: 32,
  },
  topicsList: {
    gap: 12,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  topicColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  topicName: {
    flex: 1,
    fontSize: 16,
  },
  topicTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  noDataText: {
    textAlign: 'center',
    color: '#64748b',
    fontStyle: 'italic',
    marginVertical: 16,
  },
});

export default DashboardScreen;


