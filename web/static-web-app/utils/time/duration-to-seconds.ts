import { DurationFormat } from "../../types";

const convertDurationToSeconds = ({
  amount,
  format,
}: {
  amount: number;
  format: DurationFormat;
}): number => {
  let seconds = 1;

  if (format === DurationFormat.MINUTES) {
    seconds = amount * 60;
  } else if (format === DurationFormat.HOURS) {
    seconds = amount * 60 * 60;
  } else if (format === DurationFormat.DAYS) {
    seconds = amount * 60 * 60 * 24;
  } else if (format === DurationFormat.MONTHS) {
    seconds = amount * 60 * 60 * 24 * 30;
  } else if (format === DurationFormat.YEARS) {
    seconds = amount * 60 * 60 * 24 * 365;
  } else {
    throw "not a valid format";
  }

  return seconds;
};

export default convertDurationToSeconds;
