import { useQuery } from "@tanstack/react-query";
import { TeamTimeStat, TeamMemberActivity, TeamTopicDistribution } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useTeamStats(teamId: number | undefined) {
  // Get team general statistics
  const { 
    data: teamStats, 
    isLoading: isLoadingStats,
    error: statsError 
  } = useQuery<TeamTimeStat>({
    queryKey: [`/api/teams/${teamId}/stats`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!teamId,
    retry: 3
  });

  // Get team member activity
  const { 
    data: memberActivity, 
    isLoading: isLoadingMemberActivity,
    error: memberActivityError 
  } = useQuery<TeamMemberActivity[]>({
    queryKey: [`/api/teams/${teamId}/stats/member-activity`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!teamId,
    retry: 3
  });

  // Get team topic distribution
  const { 
    data: topicDistribution, 
    isLoading: isLoadingTopicDistribution,
    error: topicDistributionError 
  } = useQuery<TeamTopicDistribution[]>({
    queryKey: [`/api/teams/${teamId}/stats/topic-distribution`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!teamId,
    retry: 3
  });

  // Get team members
  const { 
    data: teamMembers, 
    isLoading: isLoadingTeamMembers,
    error: teamMembersError 
  } = useQuery({
    queryKey: [`/api/teams/${teamId}/members`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!teamId,
    retry: 3
  });

  const isLoading = isLoadingStats || isLoadingMemberActivity || isLoadingTopicDistribution || isLoadingTeamMembers;
  const error = statsError || memberActivityError || topicDistributionError || teamMembersError;

  return {
    teamStats,
    memberActivity,
    topicDistribution,
    teamMembers,
    isLoading,
    error
  };
}