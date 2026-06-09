import { getActivityChoices } from "../../config/activities";
import type { CommandDefinition } from "../../discord/types";

export const pingDefinition: CommandDefinition = {
  name: "ping",
  description: "Ping an activity role and invite people to join your voice channel.",
  type: 1,
  options: [
    {
      name: "activity",
      description: "The activity you want to ping.",
      type: 3,
      required: true,
      choices: getActivityChoices(),
    },
    {
      name: "description",
      description: "Details about what you are doing.",
      type: 3,
      required: true,
      max_length: 500,
    },
  ],
};
