import { Question } from '@prisma/client';

export interface WeeklyTaData extends Pick<Question, 'taId' | 'taName'> {
	week: string;
	sumInSec: number;
	count: BigInt;
	avgResponseInSec: number;
}

export interface MonthlyTaData extends Omit<WeeklyTaData, 'week'> {
	month: string;
}

export interface weekDuration {
	start: number;
	end: number;
}

export interface monthDuration {
	start: number;
	end: number;
}
