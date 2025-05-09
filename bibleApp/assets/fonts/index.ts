import {Platform} from 'react-native';

const Fonts = {
  LIGHT: Platform.OS === 'ios' ? 'Montserrat-Light' : 'Light',
  REGULAR: Platform.OS === 'ios' ? 'Montserrat-Regular' : 'Regular',
  MEDIUM: Platform.OS === 'ios' ? 'Montserrat-Medium' : 'Medium',
  BOLD: Platform.OS === 'ios' ? 'Montserrat-Bold' : 'Bold',
  SEMI_BOLD: Platform.OS === 'ios' ? 'Montserrat-SemiBold' : 'SemiBold',
  EXTRA_BOLD: Platform.OS === 'ios' ? 'Montserrat-ExtraBold' : 'ExtraBold',
};

export default Fonts;
