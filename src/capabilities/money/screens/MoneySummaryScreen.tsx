import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MoneyStackParamList } from '../navigation/types';
import type { MoneyPlaceRouteName } from '../navigation/types';
import { MoneyStructuralScreen } from './MoneyStructuralScreen';

export function MoneySummaryScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneySummary'>) {
  return (
    <MoneyStructuralScreen
      activePlace="MoneySummary"
      onSelectPlace={(place) => (navigation.navigate as (route: MoneyPlaceRouteName) => void)(place)}
      title="Money"
    />
  );
}
