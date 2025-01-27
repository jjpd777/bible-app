import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

type SelectableOptionsProps = {
  options: string[];
  selectedOptions: string[];
  onToggleOption: (option: string) => void;
};

export const SelectableOptions = ({ 
  options, 
  selectedOptions, 
  onToggleOption 
}: SelectableOptionsProps) => (
  <View style={styles.predefinedOptionsContainer}>
    {options.map((option, index) => {
      const isSelected = selectedOptions.includes(option);
      return (
        <TouchableOpacity
          key={index}
          style={[styles.predefinedOption, isSelected && styles.selectedOption]}
          onPress={() => onToggleOption(option)}
        >
          <Text style={[
            styles.predefinedOptionText,
            isSelected && styles.selectedOptionText
          ]}>{option}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  predefinedOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  predefinedOption: {
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  predefinedOptionText: {
    color: Colors.light.primary,
    fontSize: 16,
  },
  selectedOption: {
    backgroundColor: '#E6D4F2', // Lighter purple
  },
  selectedOptionText: {
    color: '#6B1E9B', // Darker purple
  },
});