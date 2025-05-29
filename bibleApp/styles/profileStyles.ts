import { StyleSheet } from 'react-native';

export const profileStyles = StyleSheet.create({
  // Common button styles
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  
  // Input styles
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
  },
  
  // Validation styles
  validationMessage: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  validationText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  validationSuccess: {
    color: '#27ae60',
  },
  validationError: {
    color: '#e74c3c',
  },
  validationMessageSuccess: {
    backgroundColor: '#f0fff4',
    borderColor: '#27ae60',
    borderWidth: 1,
  },
  validationMessageError: {
    backgroundColor: '#fef2f2',
    borderColor: '#e74c3c',
    borderWidth: 1,
  },
  
  // ... other shared styles
}); 