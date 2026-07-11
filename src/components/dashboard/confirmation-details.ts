export type ConfirmationAction = 'switchAdvisor' | 'logout' | 'changeStore';

export const CONFIRMATION_DETAILS: Record<ConfirmationAction, { title: string; description: string }> = {
  switchAdvisor: {
    title: 'Are you sure?',
    description: 'This will take you to the advisor selection screen.',
  },
  changeStore: {
    title: 'Change Store?',
    description: 'This will return you to the main store selection screen.',
  },
  logout: {
    title: 'Logout?',
    description: 'You will be returned to the store selection screen.',
  },
};
