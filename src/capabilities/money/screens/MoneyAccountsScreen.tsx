import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MoneyStackParamList } from '../navigation/types';
import type { MoneyPlaceRouteName } from '../navigation/types';
import { MoneyStructuralScreen } from './MoneyStructuralScreen';

export function MoneyAccountsScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneyAccounts'>) {
  return (
    <MoneyStructuralScreen
      activePlace="MoneyAccounts"
      onSelectPlace={(place) => (navigation.navigate as (route: MoneyPlaceRouteName) => void)(place)}
      title="Accounts"
    />
  );
}
