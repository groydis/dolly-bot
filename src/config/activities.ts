export type ActivityKey =
  | "miners"
  | "salvagers"
  | "haulers"
  | "industry"
  | "fleet_ops"
  | "pvp"
  | "capital_ship_owners"
  | "event_pings"
  | "ptu"
  | "joint_ops"
  | "response_unit"
  | "medics"
  | "hathor"
  | "exec_hangars"
  | "contested_zoners"
  | "rock_breakers"
  | "tsg"
  | "mission_grinders"
  | "qv_logistics"
  | "special_events";

export interface ActivityConfig {
  label: string;
  roleId: string;
  targetChannelId?: string;
}

export const ACTIVITY_KEYS: readonly ActivityKey[] = [
  "miners",
  "salvagers",
  "haulers",
  "industry",
  "fleet_ops",
  "pvp",
  "capital_ship_owners",
  "event_pings",
  "ptu",
  "joint_ops",
  "response_unit",
  "medics",
  "hathor",
  "exec_hangars",
  "contested_zoners",
  "rock_breakers",
  "tsg",
  "mission_grinders",
  "qv_logistics",
  "special_events",
] as const;

export const ACTIVITIES: Record<ActivityKey, ActivityConfig> = {
  miners: {
    label: "Miners",
    roleId: "1511677371462320198",
  },
  salvagers: {
    label: "Salvagers",
    roleId: "1511677455742664715",
  },
  haulers: {
    label: "Haulers",
    roleId: "1511677409320243331",
  },
  industry: {
    label: "Industry",
    roleId: "1449008641989677057",
  },
  fleet_ops: {
    label: "Fleet Ops",
    roleId: "1277449803923722260",
  },
  pvp: {
    label: "PVP",
    roleId: "1449008259125084284",
  },
  capital_ship_owners: {
    label: "Capital Ship Owners",
    roleId: "1447228109194788864",
  },
  event_pings: {
    label: "Event Pings",
    roleId: "1303565812187140116",
  },
  ptu: {
    label: "PTU",
    roleId: "1449013757165568002",
  },
  joint_ops: {
    label: "Joint Ops",
    roleId: "1504354510284525688",
  },
  response_unit: {
    label: "Response Unit",
    roleId: "1511676978120626176",
  },
  medics: {
    label: "Medics",
    roleId: "1511677607861551196",
  },
  hathor: {
    label: "Hathor Mining Laser",
    roleId: "1511677660345008128",
  },
  exec_hangars: {
    label: "Executive Hangars",
    roleId: "1511677732441030826",
  },
  contested_zoners: {
    label: "Contested Zoners",
    roleId: "1511677891258224802",
  },
  rock_breakers: {
    label: "Rock Breakers",
    roleId: "1511677695505731666",
  },
  tsg: {
    label: "Tactical Strike Group",
    roleId: "1511677843959058493",
  },
  mission_grinders: {
    label: "Mission Grinders",
    roleId: "1511677995062919219",
  },
  qv_logistics: {
    label: "QV Logistics",
    roleId: "1511678117062774876",
  },
  special_events: {
    label: "Special Events",
    roleId: "1511678027417915498",
  },
};

export function isActivityKey(value: string): value is ActivityKey {
  return value in ACTIVITIES;
}

export function getActivity(key: string): ActivityConfig | undefined {
  if (!isActivityKey(key)) {
    return undefined;
  }

  return ACTIVITIES[key];
}

export function getAllActivityRoleIds(): string[] {
  return Object.values(ACTIVITIES).map((activity) => activity.roleId);
}

export function getActivityChoices(): Array<{ name: string; value: ActivityKey }> {
  return ACTIVITY_KEYS.map((key) => ({
    name: ACTIVITIES[key].label,
    value: key,
  }));
}
