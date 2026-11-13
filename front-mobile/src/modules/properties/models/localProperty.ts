export interface LocalUnit {
  id: string;
  name: string;
}

export interface LocalProperty {
  id: string;
  ownerName: string;
  name: string;
  address: string;
  units: LocalUnit[];
}
