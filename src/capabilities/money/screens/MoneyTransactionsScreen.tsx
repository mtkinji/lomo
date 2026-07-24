import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MoneyStackParamList } from '../navigation/types';
import type { MoneyPlaceRouteName } from '../navigation/types';
import { MoneyStructuralScreen } from './MoneyStructuralScreen';

export function MoneyTransactionsScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneyTransactions'>) {
  return (
    <MoneyStructuralScreen
      activePlace="MoneyTransactions"
      onSelectPlace={(place) => (navigation.navigate as (route: MoneyPlaceRouteName) => void)(place)}
      title="Transactions"
    />
  );
}
