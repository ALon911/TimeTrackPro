# Crew Isolation and Admin Requirements

This document explains the crew isolation system and admin requirements implemented in TimeTrackPro.

## Overview

The system now enforces crew isolation by default, ensuring that:
1. **Crews cannot see other crews** unless explicitly configured to allow cross-crew access
2. **Each crew must have at least one admin** (owner or admin role)
3. **Crew visibility settings** can be configured for cross-crew collaboration

## Crew Isolation Features

### 1. Default Isolation
- **Private by Default**: All crews are private by default
- **No Cross-Crew Access**: Crews cannot see other crews unless explicitly allowed
- **Member-Only Access**: Users can only see crews they are members of

### 2. Crew Visibility Settings
- **Private**: Crew is only visible to its members
- **Public**: Crew can be discovered by other users
- **Cross-Crew Access**: Allows crew members to see other crews (configurable per crew)

### 3. Admin Requirements
- **At Least One Admin**: Each crew must have at least one admin (owner or admin role)
- **Admin Protection**: Cannot remove the last admin from a crew
- **Role Demotion Protection**: Cannot demote the last admin to member

## Database Schema Changes

### Teams Table
```sql
CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',           -- NEW: private/public
  allow_cross_crew_access INTEGER NOT NULL DEFAULT 0,    -- NEW: 0/1
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Team Members Table
```sql
CREATE TABLE team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',  -- owner, admin, member
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(team_id, user_id)
);
```

## API Endpoints

### Crew Management

#### Get User's Crews (Isolated)
```http
GET /api/teams
```
Returns only crews where the user is a member.

#### Get All Crews (Including Cross-Crew Access)
```http
GET /api/teams/all
```
Returns user's crews plus crews that allow cross-crew access.

#### Create Crew
```http
POST /api/teams
Content-Type: application/json

{
  "name": "My Crew",
  "visibility": "private",           // optional: private/public
  "allowCrossCrewAccess": false      // optional: true/false
}
```

#### Update Crew Settings
```http
PATCH /api/teams/:id/crew-settings
Content-Type: application/json

{
  "visibility": "public",            // optional: private/public
  "allowCrossCrewAccess": true       // optional: true/false
}
```

### Admin Management

#### Get Crew Admins
```http
GET /api/teams/:id/admins
```
Returns all admins (owners and admins) of the crew.

#### Update Member Role
```http
PATCH /api/teams/:teamId/members/:userId/role
Content-Type: application/json

{
  "role": "admin"  // member, admin
}
```

#### Remove Member
```http
DELETE /api/teams/:teamId/members/:userId
```
Prevents removal if it would leave the crew without admins.

## Crew Isolation Rules

### 1. Visibility Rules
- **Private Crews**: Only visible to members
- **Public Crews**: Can be discovered by other users
- **Cross-Crew Access**: Must be explicitly enabled per crew

### 2. Access Rules
- **Default Access**: Users can only see crews they are members of
- **Cross-Crew Access**: Only works if both crews allow it
- **Admin Override**: Crew owners can see all crews they own

### 3. Admin Rules
- **Minimum Admins**: Each crew must have at least one admin
- **Owner Protection**: Cannot remove the crew owner
- **Admin Protection**: Cannot remove the last admin
- **Role Protection**: Cannot demote the last admin to member

## Implementation Details

### Database Methods

#### Crew Isolation
```typescript
// Get user's crews only
async getTeams(userId: number): Promise<Team[]>

// Get all crews including cross-crew access
async getAllTeams(userId: number): Promise<Team[]>
```

#### Admin Validation
```typescript
// Check if crew has admins
async hasTeamAdmin(teamId: number): Promise<boolean>

// Get crew admins
async getTeamAdmins(teamId: number): Promise<TeamMember[]>

// Remove member (with admin validation)
async removeTeamMember(teamId: number, userId: number): Promise<boolean>

// Update role (with admin validation)
async updateTeamMemberRole(teamId: number, userId: number, role: string): Promise<TeamMember>
```

### Error Handling

#### Admin Protection Errors
- `"Cannot remove the last admin from the team"`
- `"Cannot demote the last admin to member"`

#### Access Control Errors
- `"You do not have permission to access this resource"`
- `"Only team owners can remove members"`

## Usage Examples

### Creating a Private Crew
```typescript
const crew = await storage.createTeam({
  name: "Development Team",
  ownerId: userId,
  visibility: "private",
  allowCrossCrewAccess: false
});
```

### Creating a Public Crew with Cross-Crew Access
```typescript
const crew = await storage.createTeam({
  name: "Open Source Project",
  ownerId: userId,
  visibility: "public",
  allowCrossCrewAccess: true
});
```

### Checking Crew Admins
```typescript
const hasAdmins = await storage.hasTeamAdmin(crewId);
const admins = await storage.getTeamAdmins(crewId);
```

### Safe Member Removal
```typescript
try {
  await storage.removeTeamMember(crewId, userId);
} catch (error) {
  if (error.message.includes('last admin')) {
    // Handle admin protection error
    console.log('Cannot remove last admin');
  }
}
```

## Security Considerations

### 1. Access Control
- **Authentication Required**: All crew operations require authentication
- **Authorization Checks**: Users can only access crews they belong to
- **Owner Permissions**: Only crew owners can modify crew settings

### 2. Data Isolation
- **Crew Separation**: Crew data is isolated by default
- **Cross-Crew Access**: Must be explicitly enabled
- **Admin Protection**: Prevents crew lockout scenarios

### 3. Validation
- **Input Validation**: All crew settings are validated
- **Role Validation**: Role changes are validated for admin requirements
- **Permission Validation**: Access is validated for all operations

## Migration Notes

### Existing Crews
- **Default Settings**: Existing crews default to private with no cross-crew access
- **Admin Status**: Existing crew owners are automatically admins
- **Backward Compatibility**: All existing functionality is preserved

### Database Migration
The system automatically adds the new columns with default values:
- `visibility` defaults to `'private'`
- `allow_cross_crew_access` defaults to `false`

## Best Practices

### 1. Crew Management
- **Assign Multiple Admins**: Always have at least 2 admins per crew
- **Regular Admin Checks**: Monitor admin status regularly
- **Clear Role Definitions**: Define clear roles and responsibilities

### 2. Security
- **Principle of Least Privilege**: Only grant necessary permissions
- **Regular Access Reviews**: Review crew membership regularly
- **Secure Settings**: Use private crews for sensitive projects

### 3. Collaboration
- **Cross-Crew Access**: Enable only when necessary
- **Public Crews**: Use sparingly for open projects
- **Clear Communication**: Document crew purposes and access levels

## Troubleshooting

### Common Issues

1. **"Cannot remove last admin"**
   - **Cause**: Trying to remove the only admin from a crew
   - **Solution**: Promote another member to admin first

2. **"Cannot demote last admin"**
   - **Cause**: Trying to demote the only admin to member
   - **Solution**: Promote another member to admin first

3. **"Crew not visible"**
   - **Cause**: Crew is private and user is not a member
   - **Solution**: Join the crew or enable cross-crew access

### Debug Steps

1. **Check Crew Settings**: Verify visibility and cross-crew access settings
2. **Verify Membership**: Ensure user is a member of the crew
3. **Check Admin Status**: Verify crew has at least one admin
4. **Review Permissions**: Check user's role and permissions

## Future Enhancements

- **Crew Hierarchies**: Support for nested crew structures
- **Advanced Permissions**: Granular permission system
- **Crew Analytics**: Analytics and reporting for crew activities
- **Bulk Operations**: Bulk crew management operations
- **Integration APIs**: Third-party integration capabilities
