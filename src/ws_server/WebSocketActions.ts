type RegistrationOrLoginAction = {
  type: 'reg';
  data: {
    name: string;
    password: string;
  };
  id: number;
};

export type WebSocketAction = RegistrationOrLoginAction;
