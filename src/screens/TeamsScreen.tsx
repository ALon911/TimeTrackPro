import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import apiService from '../services/api';
import { Team, TeamInvitation } from '../types';

const TeamsScreen: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: teams = [], isLoading: teamsLoading } = useQuery(
    'teams',
    apiService.getTeams
  );

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery(
    'teamInvitations',
    apiService.getTeamInvitations
  );

  const acceptInvitationMutation = useMutation(
    (invitationId: number) => apiService.acceptTeamInvitation(invitationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('teamInvitations');
        queryClient.invalidateQueries('teams');
      },
    }
  );

  const declineInvitationMutation = useMutation(
    (invitationId: number) => apiService.declineTeamInvitation(invitationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('teamInvitations');
      },
    }
  );

  const handleAcceptInvitation = (invitationId: number) => {
    acceptInvitationMutation.mutate(invitationId);
  };

  const handleDeclineInvitation = (invitationId: number) => {
    declineInvitationMutation.mutate(invitationId);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card style={styles.invitationsCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>הזמנות ממתינות</Title>
            {invitationsLoading ? (
              <ActivityIndicator style={styles.loading} />
            ) : (
              invitations.map((invitation) => (
                <Card key={invitation.id} style={styles.invitationCard}>
                  <Card.Content>
                    <Paragraph style={styles.invitationText}>
                      הוזמנת להצטרף לצוות
                    </Paragraph>
                    <View style={styles.invitationActions}>
                      <Button
                        mode="contained"
                        onPress={() => handleAcceptInvitation(invitation.id)}
                        style={styles.acceptButton}
                        disabled={acceptInvitationMutation.isLoading}
                      >
                        קבל
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleDeclineInvitation(invitation.id)}
                        style={styles.declineButton}
                        disabled={declineInvitationMutation.isLoading}
                      >
                        דחה
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </Card.Content>
        </Card>
      )}

      {/* My Teams */}
      <Card style={styles.teamsCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>הצוותים שלי</Title>
          {teamsLoading ? (
            <ActivityIndicator style={styles.loading} />
          ) : teams.length > 0 ? (
            teams.map((team) => (
              <Card key={team.id} style={styles.teamCard}>
                <Card.Content>
                  <Title style={styles.teamName}>{team.name}</Title>
                  {team.description && (
                    <Paragraph style={styles.teamDescription}>
                      {team.description}
                    </Paragraph>
                  )}
                  <Chip
                    mode="outlined"
                    style={styles.memberChip}
                  >
                    חבר צוות
                  </Chip>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Title style={styles.emptyTitle}>אין צוותים</Title>
                <Paragraph style={styles.emptyText}>
                  אתה עדיין לא חבר באף צוות
                </Paragraph>
              </Card.Content>
            </Card>
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
  invitationsCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  teamsCard: {
    elevation: 2,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  loading: {
    marginVertical: 32,
  },
  invitationCard: {
    marginBottom: 12,
    elevation: 1,
    borderRadius: 8,
  },
  invitationText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  invitationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#10b981',
  },
  declineButton: {
    flex: 1,
    borderColor: '#ef4444',
  },
  teamCard: {
    marginBottom: 12,
    elevation: 1,
    borderRadius: 8,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  teamDescription: {
    color: '#64748b',
    marginBottom: 8,
  },
  memberChip: {
    alignSelf: 'flex-start',
  },
  emptyCard: {
    elevation: 1,
    borderRadius: 8,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
  },
});

export default TeamsScreen;


