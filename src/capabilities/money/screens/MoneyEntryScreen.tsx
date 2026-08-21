import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MoneyStackParamList } from '../navigation/types';
import { MoneySetupExperience } from './MoneySetupScreen';

export function MoneyEntryScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneyEntry'>) {
  return (
    <MoneySetupExperience
      mode={route.params.mode}
      navigation={navigation}
      requestedPlace={route.params.requestedPlace}
      source={route.params.source}
      demoScenario={route.params.demoScenario}
    />
  );
}
