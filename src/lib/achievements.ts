
import { DriveLog, Advisor, Vehicle } from './types';
import { isSameDay, differenceInDays, startOfWeek, endOfWeek, isBefore, isAfter, getHours, getDay, isWithinInterval, getMonth, getDate, subMonths } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export type AchievementCategory = 
    | 'Mastery & Milestones'
    | 'Performance & Excellence'
    | 'Tenacity & Hustle'
    | 'Knowledge & Evangelism'
    | 'Quirky & Fun'
    | 'Operational Excellence'
    | 'Elite & Secret';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    category: AchievementCategory;
    iconUrl: string;
    isSecret?: boolean;
    checker: (advisor: Advisor, driveLogs: DriveLog[], allAdvisorLogs: DriveLog[], vehicles: Vehicle[]) => boolean;
}

export const getDriveDate = (drive: DriveLog): Date => {
    if (!drive.startTime) return new Date(0);
    return drive.startTime instanceof Timestamp ? drive.startTime.toDate() : new Date(drive.startTime as number | Date);
}
const getCompletedDrives = (driveLogs: DriveLog[]) => driveLogs.filter(log => log.endTime);

export const achievements: Achievement[] = [
    // Category 1: Mastery & Milestones
    {
        id: 'first-drive',
        title: 'First Drive Conductor',
        description: 'Unlocked after completing their first demo drive.',
        category: 'Mastery & Milestones',
        iconUrl: '/media/trophy.png',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).length >= 1,
    },
    {
        id: 'novice-advisor',
        title: 'Novice Advisor',
        description: 'Completed 10 total demo drives.',
        category: 'Mastery & Milestones',
        iconUrl: '/media/ten.svg',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).length >= 10,
    },
    {
        id: 'trusted-guide',
        title: 'Trusted Guide',
        description: 'Completed 30 total demo drives.',
        category: 'Mastery & Milestones',
        iconUrl: '/media/thirty.svg',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).length >= 30,
    },
    {
        id: 'product-expert',
        title: 'Product Expert',
        description: 'Completed 50 total demo drives.',
        category: 'Mastery & Milestones',
        iconUrl: '/media/fifty.svg',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).length >= 50,
    },
    {
        id: 'elite-ambassador',
        title: 'Elite Ambassador',
        description: 'Completed 100 total demo drives.',
        category: 'Mastery & Milestones',
        iconUrl: '/media/hundred-points.svg',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).length >= 100,
    },
    {
        id: 'first-conversion',
        title: 'First Conversion',
        description: 'Noted a customer purchase after a demo drive.',
        category: 'Performance & Excellence',
        iconUrl: '/media/trophy.png',
        checker: (advisor, driveLogs) =>
            getCompletedDrives(driveLogs).some(log => log.customerPurchased),
    },
    {
        id: 'closer',
        title: 'The Closer',
        description: 'Noted 5 customer purchases after demo drives.',
        category: 'Performance & Excellence',
        iconUrl: '/media/fifty.svg',
        checker: (advisor, driveLogs) =>
            getCompletedDrives(driveLogs).filter(log => log.customerPurchased).length >= 5,
    },
    {
        id: 'hot-closer',
        title: 'Hot Closer',
        description: 'Noted 3 customer purchases within a single week.',
        category: 'Performance & Excellence',
        iconUrl: '/media/hundred-points.svg',
        checker: (advisor, driveLogs) => {
            const purchases = getCompletedDrives(driveLogs).filter(log => log.customerPurchased);
            const weekStarts = purchases.map(log => startOfWeek(getDriveDate(log), { weekStartsOn: 1 }).getTime());
            return weekStarts.some(week =>
                purchases.filter(log =>
                    startOfWeek(getDriveDate(log), { weekStartsOn: 1 }).getTime() === week
                ).length >= 3
            );
        },
    },
    {
        id: 'trifecta',
        title: 'Trifecta',
        description: 'Completed 3 demo drives in a single day.',
        category: 'Mastery & Milestones',
        iconUrl: '/media/ok-hand.svg',
        checker: (advisor, driveLogs) => {
            const completed = getCompletedDrives(driveLogs);
            const drivesByDay: Record<string, number> = {};
            completed.forEach(log => {
                const day = getDriveDate(log).toISOString().split('T')[0];
                drivesByDay[day] = (drivesByDay[day] || 0) + 1;
            });
            return Object.values(drivesByDay).some(count => count >= 3);
        },
    },
    {
        id: 'pentathlon',
        title: 'Pentathlon',
        description: 'Completed 5 demo drives in a single day.',
        category: 'Mastery & Milestones',
        iconUrl: '/media/ribbon.png',
        checker: (advisor, driveLogs) => {
            const completed = getCompletedDrives(driveLogs);
            const drivesByDay: Record<string, number> = {};
            completed.forEach(log => {
                const day = getDriveDate(log).toISOString().split('T')[0];
                drivesByDay[day] = (drivesByDay[day] || 0) + 1;
            });
            return Object.values(drivesByDay).some(count => count >= 5);
        },
    },
    {
        id: 'consistency-is-key',
        title: 'Consistency is Key',
        description: 'Completed at least one demo drive every day for 14 consecutive days.',
        category: 'Mastery & Milestones',
        iconUrl: '/media/ownership.png',
        checker: (advisor, driveLogs) => {
            const completedDates = [...new Set(getCompletedDrives(driveLogs).map(log => getDriveDate(log).toISOString().split('T')[0]))].sort();
            if (completedDates.length < 14) return false;
            for (let i = 0; i <= completedDates.length - 14; i++) {
                let isConsecutive = true;
                for (let j = 0; j < 13; j++) {
                    const current = new Date(completedDates[i + j]);
                    const next = new Date(completedDates[i + j + 1]);
                    if (differenceInDays(next, current) !== 1) {
                        isConsecutive = false;
                        break;
                    }
                }
                if (isConsecutive) return true;
            }
            return false;
        },
    },
     {
        id: 'model-maestro',
        title: 'Model Maestro',
        description: 'Conducted demo drives in every EV model available at their location.',
        category: 'Mastery & Milestones',
        iconUrl: '/media/tesla.png',
        checker: (advisor, driveLogs, allAdvisorLogs, vehicles) => {
            const storeModels = new Set(vehicles.map(v => v.model));
            const drivenModels = new Set(getCompletedDrives(driveLogs).map(log => log.vehicleModel));
            return storeModels.size > 0 && [...storeModels].every(model => drivenModels.has(model));
        }
    },
    {
        id: 'fleet-familiarizer',
        title: 'Fleet Familiarizer',
        description: 'Have driven at least 5 different unique VINs.',
        category: 'Mastery & Milestones',
        iconUrl: '/media/badass.png',
        checker: (advisor, driveLogs) => new Set(getCompletedDrives(driveLogs).map(log => log.vehicleVin)).size >= 5,
    },
    {
        id: 'vin-vanguard',
        title: 'VIN Vanguard',
        description: 'Have driven at least 15 different unique VINs.',
        category: 'Mastery & Milestones',
        iconUrl: '/media/15.png',
        checker: (advisor, driveLogs) => new Set(getCompletedDrives(driveLogs).map(log => log.vehicleVin)).size >= 15,
    },
    // Category 2: Performance & Excellence
    {
        id: 'punctual-pro',
        title: 'Punctual Pro',
        description: 'Had less than 5 "overdue" check-ins for 2 straight weeks.',
        category: 'Performance & Excellence',
        iconUrl: '/media/punctual.png',
        checker: (advisor, driveLogs) => {
            // Placeholder logic: This requires historical data analysis beyond the scope of a simple check.
            // For now, we grant it if they have very few total overdue drives.
            const completed = getCompletedDrives(driveLogs);
            const overdueDrives = completed.filter(log => {
                const start = getDriveDate(log).getTime();
                const end = log.endTime ? (log.endTime instanceof Timestamp ? log.endTime.toDate().getTime() : new Date(log.endTime).getTime()) : 0;
                return (end - start) > (log.expectedDuration * 60 * 1000 + 5 * 60 * 1000); // 5 min grace
            });
            return overdueDrives.length < 2 && completed.length > 10;
        },
    },
    {
        id: 'perfect-handover',
        title: 'The Perfect Handover',
        description: 'Checked a vehicle back in with a battery level above 80% for 10 consecutive drives.',
        category: 'Performance & Excellence',
        iconUrl: '/media/perfect.png',
        checker: (advisor, driveLogs) => {
            const completed = getCompletedDrives(driveLogs);
            if (completed.length < 10) return false;
            let consecutiveCount = 0;
            for (const log of completed) {
                if (log.endBattery && log.endBattery > 80) {
                    consecutiveCount++;
                    if (consecutiveCount >= 10) return true;
                } else {
                    consecutiveCount = 0;
                }
            }
            return false;
        },
    },
    {
        id: 'feedback-champion',
        title: 'Feedback Champion',
        description: 'Consistently collects detailed customer feedback (provided in 90% of check-ins).',
        category: 'Performance & Excellence',
        iconUrl: '/media/customer-satisfaction.svg',
        checker: (advisor, driveLogs) => {
            const completed = getCompletedDrives(driveLogs);
            if (completed.length < 10) return false;
            const withFeedback = completed.filter(log => log.feedback && log.feedback.length > 10);
            return (withFeedback.length / completed.length) >= 0.9;
        },
    },
    {
        id: 'issue-spotter',
        title: 'Issue Spotter',
        description: 'Check-in feedback triggers the "Needs Attention" flag, leading to a resolved issue.',
        category: 'Performance & Excellence',
        iconUrl: '/media/concern.png',
        checker: (advisor, driveLogs) => driveLogs.some(log => log.issueDetected),
    },
    {
        id: 'insightful-advisor',
        title: 'Insightful Advisor',
        description: 'Received 5 customer feedback comments that were 2+ sentences long.',
        category: 'Performance & Excellence',
        iconUrl: '/media/search.png',
        checker: (advisor, driveLogs) => {
            const insightfulFeedbackCount = getCompletedDrives(driveLogs).filter(log => {
                if (!log.feedback) return false;
                // Split by sentence-ending punctuation and filter out empty strings
                const sentences = log.feedback.split(/[.!?]+/).filter(s => s.trim().length > 0);
                return sentences.length >= 2;
            }).length;
            return insightfulFeedbackCount >= 5;
        },
    },
    {
        id: 'fleet-doctor',
        title: 'Fleet Doctor',
        description: 'Logged 5 separate "Issue Spotter" flags.',
        category: 'Performance & Excellence',
        iconUrl: '/media/heart-rate.png',
        checker: (advisor, driveLogs) => driveLogs.filter(log => log.issueDetected).length >= 5,
    },
     {
        id: 'zero-to-smile',
        title: 'Zero to Smile',
        description: 'Logged feedback where a customer used the word "fun" or "amazing" to describe the acceleration.',
        category: 'Performance & Excellence',
        iconUrl: '/media/amazing.png',
        checker: (advisor, driveLogs) => {
            const keywords = ['fun', 'amazing', 'insane', 'unbelievable'];
            const relatedWords = ['acceleration', 'speed', 'fast', 'quick'];
            return getCompletedDrives(driveLogs).some(log =>
                log.feedback &&
                keywords.some(kw => log.feedback!.toLowerCase().includes(kw)) &&
                relatedWords.some(rw => log.feedback!.toLowerCase().includes(rw))
            );
        },
    },
    {
        id: 'efficiency-expert',
        title: 'Efficiency Expert',
        description: 'Maintained an average demo drive duration within the store\'s ideal target range (e.g., 30-45 mins) for 50+ drives.',
        category: 'Performance & Excellence',
        iconUrl: '/media/average.png',
        checker: (advisor, driveLogs) => {
            const completed = getCompletedDrives(driveLogs).filter(l => l.purpose === 'Demo');
            if (completed.length < 50) return false;
            
            const totalDuration = completed.reduce((acc, log) => {
                const start = getDriveDate(log).getTime();
                const end = log.endTime ? (log.endTime instanceof Timestamp ? log.endTime.toDate().getTime() : new Date(log.endTime).getTime()) : start;
                return acc + (end - start);
            }, 0);

            const avgMinutes = (totalDuration / completed.length) / (60 * 1000);
            return avgMinutes >= 30 && avgMinutes <= 45;
        },
    },
    // Category 3: Tenacity & Hustle
    {
        id: 'weekend-warrior',
        title: 'Weekend Warrior',
        description: 'Conducts the most demo drives on a single weekend.',
        category: 'Tenacity & Hustle',
        iconUrl: '/media/spartan.png',
        checker: (advisor, driveLogs, allAdvisorLogs) => {
            if (!allAdvisorLogs) return false; // Guard clause
            const weekendLogs = allAdvisorLogs.filter(log => getDay(getDriveDate(log)) === 0 || getDay(getDriveDate(log)) === 6);
            if(weekendLogs.length === 0) return false;
            const drivesByAdvisor: Record<string, number> = {};
            weekendLogs.forEach(log => {
                if (log.coPilot) drivesByAdvisor[log.coPilot] = (drivesByAdvisor[log.coPilot] || 0) + 1;
            });
            const advisorKeys = Object.keys(drivesByAdvisor);
            if (advisorKeys.length === 0) return false; // No advisors with weekend drives
            const topAdvisor = advisorKeys.reduce((a, b) => drivesByAdvisor[a] > drivesByAdvisor[b] ? a : b);
            return advisor.name === topAdvisor;
        },
    },
    {
        id: 'early-bird',
        title: 'Early Bird',
        description: 'Completes a demo drive before 11:00 AM.',
        category: 'Tenacity & Hustle',
        iconUrl: '/media/sun.png',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).some(log => getHours(getDriveDate(log)) < 11),
    },
    {
        id: 'night-owl',
        title: 'Night Owl',
        description: 'Completes the last demo drive of the day after 7:00 PM.',
        category: 'Tenacity & Hustle',
        iconUrl: '/media/owl.png',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).some(log => getHours(getDriveDate(log)) >= 19),
    },
    {
        id: 'marathon-driver',
        title: 'Marathon Driver',
        description: 'Conducts 5 or more demo drives in a single day.',
        category: 'Tenacity & Hustle',
        iconUrl: '/media/serie.png',
        checker: (advisor, driveLogs) => {
            const completed = getCompletedDrives(driveLogs);
            const drivesByDay: Record<string, number> = {};
            completed.forEach(log => {
                const day = getDriveDate(log).toISOString().split('T')[0];
                drivesByDay[day] = (drivesByDay[day] || 0) + 1;
            });
            return Object.values(drivesByDay).some(count => count >= 5);
        },
    },
    {
        id: 'lunch-rush',
        title: 'Lunch Rush',
        description: 'Conducted a demo drive during the peak lunch hour (12 PM - 2 PM).',
        category: 'Tenacity & Hustle',
        iconUrl: '/media/startup.png',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).some(log => {
            const hour = getHours(getDriveDate(log));
            return hour >= 12 && hour < 14;
        }),
    },
     {
        id: 'first-of-month',
        title: 'First of the Month',
        description: 'First advisor to complete a drive on the first day of the month.',
        category: 'Tenacity & Hustle',
        iconUrl: '/media/raised-arm.png',
        checker: (advisor, driveLogs, allAdvisorLogs) => {
            if (!allAdvisorLogs) return false;
            const firstDayLogs = allAdvisorLogs.filter(log => getDate(getDriveDate(log)) === 1);
            if (firstDayLogs.length === 0) return false;
            const firstLog = firstDayLogs.sort((a,b) => getDriveDate(a).getTime() - getDriveDate(b).getTime())[0];
            return firstLog.coPilot === advisor.name;
        }
    },
    // Category 4: Knowledge & Evangelism
     {
        id: 'electric-ambassador-1',
        title: 'Electric Ambassador I',
        description: 'Focused on 10 EV education drives.',
        category: 'Knowledge & Evangelism',
        iconUrl: '/media/lightning.png',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).filter(l => l.purpose === 'Demo').length >= 10,
    },
    {
        id: 'electric-ambassador-2',
        title: 'Electric Ambassador II',
        description: 'Focused on 25 EV education drives.',
        category: 'Knowledge & Evangelism',
        iconUrl: '/media/lightning (1).png',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).filter(l => l.purpose === 'Demo').length >= 25,
    },
    {
        id: 'electric-ambassador-3',
        title: 'Electric Ambassador III',
        description: 'Focused on 50 EV education drives.',
        category: 'Knowledge & Evangelism',
        iconUrl: '/media/lightning (2).png',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).filter(l => l.purpose === 'Demo').length >= 50,
    },
    {
        id: 'feature-guru',
        title: 'Feature Guru',
        description: 'Logged feedback mentioning a specific, advanced feature (e.g., Autopark, Dog Mode).',
        category: 'Knowledge & Evangelism',
        iconUrl: '/media/guru.png',
        checker: (advisor, driveLogs) => {
            const keywords = ['autopark', 'dog mode', 'summon', 'sentry mode', 'fsd', 'full self-driving'];
            return getCompletedDrives(driveLogs).some(log => log.feedback && keywords.some(kw => log.feedback!.toLowerCase().includes(kw)));
        },
    },
     {
        id: 'tech-talk',
        title: 'Tech Talk',
        description: 'Used the mobile app to precondition the vehicle or unlock it for a customer during a demo.',
        category: 'Knowledge & Evangelism',
        iconUrl: '/media/smart-grid.png', 
        checker: (advisor, driveLogs) => false, // Manual award
    },
    {
        id: 'autopilot-authority',
        title: 'Autopilot Authority',
        description: 'Provided a clear, safe, and effective demonstration of Autopilot/Full Self-Driving.',
        category: 'Knowledge & Evangelism',
        iconUrl: '/media/autopilot.png',
        checker: (advisor, driveLogs) => false, // Manual award
    },
    {
        id: 'matchmaker',
        title: 'Matchmaker',
        description: 'Had a customer drive the same model and color they ended up purchasing.',
        category: 'Knowledge & Evangelism',
        iconUrl: '/media/matchmaker.png',
        checker: (advisor, driveLogs) => false, // Manual award
    },
    // Category 5: Quirky & Fun
    {
        id: 'lucky-charm',
        title: 'Lucky Charm',
        description: 'A random, surprise badge awarded to one advisor per week.',
        category: 'Quirky & Fun',
        iconUrl: '/media/maneki-neko.png',
        checker: (advisor, driveLogs, allAdvisorLogs) => {
            if (!allAdvisorLogs) return false;
             // Logic to select one random advisor who has at least one drive.
            const eligibleAdvisors = [...new Set(allAdvisorLogs.filter(l => getCompletedDrives([l]).length > 0).map(l => l.coPilot))];
            if (eligibleAdvisors.length === 0) return false;
            const weekNumber = Math.floor(new Date().getDate() / 7);
            const luckyIndex = (advisor.id.charCodeAt(0) + weekNumber) % eligibleAdvisors.length;
            return eligibleAdvisors[luckyIndex] === advisor.name;
        },
    },
    {
        id: 'tour-guide',
        title: 'The Tour Guide',
        description: 'Conducted a demo drive that lasted over 90 minutes.',
        category: 'Quirky & Fun',
        iconUrl: '/media/tour-guide.png',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).some(log => {
            const start = getDriveDate(log).getTime();
            const end = log.endTime ? (log.endTime instanceof Timestamp ? log.endTime.toDate().getTime() : new Date(log.endTime).getTime()) : 0;
            return (end - start) > (90 * 60 * 1000);
        }),
    },
    {
        id: 'quick-dip',
        title: 'Quick Dip',
        description: 'Conducted a "mini-demo" (check-out to check-in) in under 20 minutes.',
        category: 'Quirky & Fun',
        iconUrl: '/media/clock.png',
        checker: (advisor, driveLogs) => getCompletedDrives(driveLogs).some(log => {
            const start = getDriveDate(log).getTime();
            const end = log.endTime ? (log.endTime instanceof Timestamp ? log.endTime.toDate().getTime() : new Date(log.endTime).getTime()) : 0;
            return end > start && (end - start) < (20 * 60 * 1000);
        }),
    },
    // Category 6: Operational Excellence
    {
        id: 'scheduler',
        title: 'Scheduler',
        description: 'Successfully used the scheduling system to book 10 future demo drives.',
        category: 'Operational Excellence',
        iconUrl: '/media/time-management.png',
        checker: (advisor, driveLogs) => driveLogs.filter(log => log.purpose === 'Scheduled').length >= 10,
    },
    {
        id: 'team-player',
        title: 'Team Player',
        description: 'Checked out a vehicle specifically to move it for charging.',
        category: 'Operational Excellence',
        iconUrl: '/media/team-spirit.png',
        checker: (advisor, driveLogs) => driveLogs.some(log => log.purpose === 'Charging'),
    },
    {
        id: 'peak-performer',
        title: 'Peak Performer',
        description: 'Conducted the most drives during the store\'s single busiest hour of the month.',
        category: 'Operational Excellence',
        iconUrl: '/media/you-are-on-fire.png',
        checker: (advisor, driveLogs, allAdvisorLogs) => {
            if (!allAdvisorLogs) return false;
            // Simplified: give it to the person with the most drives. A true impl needs more data.
            const drivesByAdvisor: Record<string, number> = {};
            getCompletedDrives(allAdvisorLogs).forEach(log => {
                if (log.coPilot) drivesByAdvisor[log.coPilot] = (drivesByAdvisor[log.coPilot] || 0) + 1;
            });
            if (Object.keys(drivesByAdvisor).length === 0) return false;
            const topAdvisor = Object.keys(drivesByAdvisor).reduce((a, b) => drivesByAdvisor[a] > drivesByAdvisor[b] ? a : b);
            return advisor.name === topAdvisor;
        }
    },
    {
        id: 'power-nap',
        title: 'Power Nap',
        description: 'Took a vehicle for charging overnight.',
        category: 'Operational Excellence',
        iconUrl: '/media/nap.png', 
        checker: (advisor, driveLogs) => {
            return getCompletedDrives(driveLogs).some(log => {
                if (log.purpose !== 'Charging') return false;

                const start = getDriveDate(log);
                const end = log.endTime ? (log.endTime instanceof Timestamp ? log.endTime.toDate() : new Date(log.endTime)) : new Date(0);

                const startHour = getHours(start);
                const endHour = getHours(end);

                // Checkout after 7 PM
                const isLateCheckout = startHour >= 19;
                // Checkin before 10 AM
                const isEarlyCheckin = endHour < 10;
                // Check if it's the next day
                const isNextDay = !isSameDay(start, end);
                // Duration is less than 10 hours
                const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                
                return isLateCheckout && isEarlyCheckin && isNextDay && durationHours < 10 && log.advisorIn === advisor.name;
            });
        },
    },
    {
        id: 'inventory-master',
        title: 'Inventory Master',
        description: 'Proactively checked the detail status of all vehicles at the start of a shift.',
        category: 'Operational Excellence',
        iconUrl: '/media/note.png',
        checker: (advisor, driveLogs) => false, // Manual award
    },
    // Category 7: Elite & Secret
    {
        id: 'flawless-week',
        title: 'Flawless Week',
        description: 'Completed 15+ drives in a week with zero negative feedback and few overdue check-ins.',
        category: 'Elite & Secret',
        iconUrl: '/media/diamond.png',
        isSecret: true,
        checker: (advisor, driveLogs) => {
            const drivesByWeek: Record<string, DriveLog[]> = {};
            getCompletedDrives(driveLogs).forEach(log => {
                const weekStart = startOfWeek(getDriveDate(log)).toISOString();
                if (!drivesByWeek[weekStart]) drivesByWeek[weekStart] = [];
                drivesByWeek[weekStart].push(log);
            });
            return Object.values(drivesByWeek).some(weekLogs => {
                const noIssues = weekLogs.every(log => !log.issueDetected);
                const overdueDrives = weekLogs.filter(log => {
                    const start = getDriveDate(log).getTime();
                    const end = log.endTime ? (log.endTime instanceof Timestamp ? log.endTime.toDate().getTime() : new Date(log.endTime).getTime()) : 0;
                    return (end - start) > (log.expectedDuration * 60 * 1000 + 5 * 60 * 1000);
                });
                return weekLogs.length >= 15 && noIssues && overdueDrives.length < 2;
            })
        },
    },
    {
        id: 'architect',
        title: 'The Architect',
        description: 'Your direct feedback led to an improvement in the Hub. This is manually awarded by management.',
        category: 'Elite & Secret',
        iconUrl: '/media/engineer.png',
        isSecret: true,
        checker: () => false,
    },
    {
        id: 'clairvoyant',
        title: 'Clairvoyant',
        description: 'Be the first to drive a new vehicle on the day it joins the fleet.',
        category: 'Elite & Secret',
        iconUrl: '/media/crystal-ball.png',
        isSecret: true,
        checker: (advisor, driveLogs, allAdvisorLogs, vehicles) => {
            if (!allAdvisorLogs) return false;
            const advisorCompletedDrives = getCompletedDrives(driveLogs);
            if (advisorCompletedDrives.length === 0) return false;

            // Find the first-ever drive for each vehicle in the entire dataset
            const firstDrivesByVin: Record<string, DriveLog> = {};
            allAdvisorLogs.forEach(log => {
                if (log.endTime) { // must be a completed drive
                    if (!firstDrivesByVin[log.vehicleVin] || getDriveDate(log) < getDriveDate(firstDrivesByVin[log.vehicleVin])) {
                        firstDrivesByVin[log.vehicleVin] = log;
                    }
                }
            });

            // Check if this advisor was the first to drive any vehicle
            return advisorCompletedDrives.some(drive => {
                const firstDriveForThisVin = firstDrivesByVin[drive.vehicleVin];
                return firstDriveForThisVin && firstDriveForThisVin.id === drive.id;
            });
        },
    },
    {
        id: 'current-keeper',
        title: 'Current Keeper',
        description: 'Took a vehicle for charging when its battery was above 70%.',
        category: 'Elite & Secret',
        iconUrl: '/media/silence.png',
        isSecret: true,
        checker: (advisor, driveLogs) => {
            return driveLogs.some(log => log.purpose === 'Charging' && log.startBattery > 70);
        },
    },
    {
        id: 'goldilocks-driver',
        title: 'Goldilocks Driver',
        description: 'Maintained an average demo drive duration between 40 and 70 minutes for a month.',
        category: 'Elite & Secret',
        iconUrl: '/media/workout.png', 
        isSecret: true,
        checker: (advisor, driveLogs) => {
            const oneMonthAgo = subMonths(new Date(), 1);
            const recentDrives = getCompletedDrives(driveLogs).filter(log =>
                log.purpose === 'Demo' && getDriveDate(log) > oneMonthAgo
            );

            if (recentDrives.length < 10) return false; // Require a minimum number of drives

            const totalDuration = recentDrives.reduce((acc, log) => {
                const start = getDriveDate(log).getTime();
                const end = log.endTime ? (log.endTime instanceof Timestamp ? log.endTime.toDate().getTime() : new Date(log.endTime).getTime()) : start;
                return acc + (end - start);
            }, 0);

            const avgMinutes = (totalDuration / recentDrives.length) / (60 * 1000);
            return avgMinutes >= 40 && avgMinutes <= 70;
        },
    },
    {
        id: 'hub-master',
        title: 'Hub Master',
        description: 'Earned every single available non-secret achievement in the Hub.',
        category: 'Elite & Secret',
        iconUrl: '/media/success.png',
        isSecret: true,
        checker: (advisor, driveLogs, allAdvisorLogs, vehicles) => {
            const nonSecretAchievements = achievements.filter(a => !a.isSecret && a.id !== 'hub-master');
            return nonSecretAchievements.every(ach => ach.checker(advisor, driveLogs, allAdvisorLogs, vehicles));
        },
    },
];
