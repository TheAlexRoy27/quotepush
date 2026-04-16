import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState } from "react";
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  Trash2,
  Loader2,
  Copy,
  Building2,
  Lock,
  Clock,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3.5 w-3.5 text-amber-400" />,
  admin: <Shield className="h-3.5 w-3.5 text-violet-400" />,
  member: <User className="h-3.5 w-3.5 text-zinc-400" />,
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export default function OrgPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: orgData } = trpc.org.me.useQuery();
  const { data: members = [], isLoading: membersLoading } = trpc.org.members.useQuery();
  const { data: billingStatus } = trpc.billing.getStatus.useQuery();
  const isOwner = orgData?.role === "owner";
  const { data: allUsers = [], isLoading: allUsersLoading } = trpc.admin.listAllUsers.useQuery(undefined, { enabled: isOwner });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [editingName, setEditingName] = useState(false);

  const inviteMutation = trpc.org.invite.useMutation();
  const removeMutation = trpc.org.removeMember.useMutation();
  const updateRoleMutation = trpc.org.updateMemberRole.useMutation();
  const updateOrgMutation = trpc.org.update.useMutation();
  const addByPhoneMutation = trpc.org.addMemberByPhone.useMutation();

  const [addPhoneOpen, setAddPhoneOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "member">("member");

  // Delete confirmation state
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [confirmRemoveName, setConfirmRemoveName] = useState("");

  const handleAddByPhone = async () => {
    if (!newPhone.trim() || !newName.trim() || !newPassword.trim()) return;
    try {
      await addByPhoneMutation.mutateAsync({ phone: newPhone.trim(), name: newName.trim(), password: newPassword.trim(), role: newRole });
      toast.success(`${newName} added successfully! They can log in at /auth with their phone number and password.`);
      setAddPhoneOpen(false);
      setNewPhone(""); setNewName(""); setNewPassword(""); setNewRole("member");
      utils.org.members.invalidate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add member");
    }
  };

  const isElite = billingStatus?.plan === "elite";
  const isOwnerOrAdmin = orgData?.role === "owner" || orgData?.role === "admin";

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const result = await inviteMutation.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
      setInviteUrl(result.inviteUrl);
      setInviteEmail("");
      utils.org.members.invalidate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create invite");
    }
  };

  const handleRemove = async (memberId: number) => {
    try {
      await removeMutation.mutateAsync({ memberId });
      toast.success("Member removed");
      utils.org.members.invalidate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove member");
    }
  };

  const handleRoleChange = async (memberId: number, role: "admin" | "member") => {
    try {
      await updateRoleMutation.mutateAsync({ memberId, role });
      toast.success("Role updated");
      utils.org.members.invalidate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update role");
    }
  };

  const handleUpdateOrgName = async () => {
    if (!orgName.trim()) return;
    try {
      await updateOrgMutation.mutateAsync({ name: orgName.trim() });
      toast.success("Organization name updated");
      setEditingName(false);
      utils.org.me.invalidate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update organization");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Organization</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your team, roles, and organization settings.
        </p>
      </div>

      {/* Org Info */}
      <Card className="border-border/60 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Organization Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={orgData?.org.name ?? "Organization name"}
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleUpdateOrgName()}
                  />
                  <Button size="sm" onClick={handleUpdateOrgName} disabled={updateOrgMutation.isPending}>
                    {updateOrgMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{orgData?.org.name ?? ""}</span>
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => { setOrgName(orgData?.org.name ?? ""); setEditingName(true); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${billingStatus?.plan === "elite" ? "bg-primary/15 text-primary border-primary/30" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"}`}>
                {billingStatus?.plan ?? "base"} plan
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Your role: <span className="font-medium text-foreground capitalize">{orgData?.role ?? ""}</span>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card className="border-border/60 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Team Members</CardTitle>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {members.filter(m => m.inviteAccepted).length} active
              </span>
            </div>
            {isOwnerOrAdmin && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setInviteOpen(true); setInviteUrl(null); }}
                  className="gap-1.5"
                  disabled={!isElite && members.filter(m => m.inviteAccepted).length >= 1}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite by Email
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAddPhoneOpen(true)}
                  className="gap-1.5"
                  disabled={!isElite && members.filter(m => m.inviteAccepted).length >= 1}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add by Phone
                </Button>
              </div>
            )}
          </div>
          {!isElite && (
            <CardDescription className="flex items-center gap-1.5 mt-1">
              <Lock className="h-3 w-3" />
              Base plan includes 1 seat. Upgrade to Elite for unlimited team members.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No team members yet.</div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border/40 space-y-3"
                >
                  {/* Top row: avatar + name + role controls + remove */}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                      {(member.user.name ?? member.user.email ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.user.name ?? member.user.email ?? member.user.phone ?? "Unknown"}
                        </p>
                        {!member.inviteAccepted && (
                          <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Pending</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        {ROLE_ICONS[member.role]}
                        {member.role === "owner" ? (
                          <span className="text-amber-400 font-medium">Owner</span>
                        ) : isOwnerOrAdmin && (member.role as string) !== "owner" ? (
                          <Select
                            value={member.role}
                            onValueChange={(v) => handleRoleChange(member.id, v as "admin" | "member")}
                          >
                            <SelectTrigger className="h-5 text-xs border-none bg-transparent p-0 w-16 focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span>{ROLE_LABELS[member.role]}</span>
                        )}
                      </div>
                    </div>
                    {isOwnerOrAdmin && (member.role as string) !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-400 shrink-0"
                        onClick={() => {
                          setConfirmRemoveId(member.id);
                          setConfirmRemoveName(member.user.name ?? member.user.email ?? member.user.phone ?? "this member");
                        }}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Detail row: contact + join date + last login */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-border/30">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {member.user.email ? (
                        <><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{member.user.email}</span></>
                      ) : member.user.phone ? (
                        <><Phone className="h-3 w-3 shrink-0" /><span className="truncate">{member.user.phone}</span></>
                      ) : (
                        <span className="italic">No contact info</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3 shrink-0" />
                      <span>Joined {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      {member.user.lastSignedIn ? (
                        <span className="text-emerald-400">
                          Last login {new Date(member.user.lastSignedIn).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Never logged in</span>
                      )}
                    </div>
                    {(member.user as typeof member.user & { consentAcceptedAt?: string | null }).consentAcceptedAt && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
                        <span>Consent accepted {new Date((member.user as typeof member.user & { consentAcceptedAt?: string | null }).consentAcceptedAt!).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── All Accounts (owner-only) ── */}
      {isOwner && (
        <Card className="border-border/60 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">All Accounts</CardTitle>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {allUsers.length} total
              </span>
            </div>
            <CardDescription className="text-xs mt-1">
              Every registered user across all organizations. Visible to owner only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allUsersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : allUsers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No accounts found.</div>
            ) : (
              <div className="space-y-3">
                {allUsers.map((account) => (
                  <div
                    key={account.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border/40 space-y-3"
                  >
                    {/* Top row: avatar + name + role badge */}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                        {(account.name ?? account.email ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {account.name ?? account.email ?? account.phone ?? "Unknown"}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          {account.role === "admin"
                            ? <><Shield className="h-3 w-3 text-violet-400" /><span className="text-violet-400">Admin</span></>
                            : <><User className="h-3 w-3" /><span>User</span></>}
                          {account.loginMethod && (
                            <span className="ml-2 text-muted-foreground/60">via {account.loginMethod}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Detail row: contact + joined + last login */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {account.email ? (
                          <><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{account.email}</span></>
                        ) : account.phone ? (
                          <><Phone className="h-3 w-3 shrink-0" /><span className="truncate">{account.phone}</span></>
                        ) : (
                          <span className="italic">No contact info</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3 w-3 shrink-0" />
                        <span>Joined {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : ""}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                        {account.lastSignedIn ? (
                          <span className="text-emerald-400">
                            Last login {new Date(account.lastSignedIn).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Never logged in</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmRemoveId !== null} onOpenChange={(open) => { if (!open) setConfirmRemoveId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{confirmRemoveName}</strong> from your organization? They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmRemoveId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-500 text-white"
              onClick={() => {
                if (confirmRemoveId !== null) handleRemove(confirmRemoveId);
                setConfirmRemoveId(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add by Phone Dialog */}
      <Dialog open={addPhoneOpen} onOpenChange={setAddPhoneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member by Phone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a login for a new team member. They can sign in at <strong>/auth</strong> using their phone number and the password you set.
            </p>
            <div className="space-y-2">
              <Label htmlFor="new-name">Full Name</Label>
              <Input
                id="new-name"
                placeholder="Jane Smith"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Mobile Number</Label>
              <Input
                id="new-phone"
                placeholder="7605184325"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Digits only, no dashes or spaces.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Temporary Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Share this with them so they can log in. They can change it later.</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "member")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin can manage leads and settings</SelectItem>
                  <SelectItem value="member">Member can view and send messages</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddPhoneOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAddByPhone}
                disabled={addByPhoneMutation.isPending || !newPhone.trim() || !newName.trim() || !newPassword.trim()}
              >
                {addByPhoneMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Member
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          {inviteUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Share this invite link with your team member:</p>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="text-xs font-mono" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Copied!"); }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full" onClick={() => { setInviteOpen(false); setInviteUrl(null); }}>
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin can manage leads and settings</SelectItem>
                    <SelectItem value="member">Member can view and send messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button onClick={handleInvite} disabled={inviteMutation.isPending || !inviteEmail.trim()}>
                  {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Invite
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
