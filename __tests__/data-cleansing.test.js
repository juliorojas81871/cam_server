import { cleanBuildingName, hasAddressInName, processRowData } from '../src/utils/data-cleansing.js';

describe('Data Cleansing Functions', () => {
  describe('cleanBuildingName', () => {
    test('should extract building name from address-building combinations', () => {
      const testCases = [
        {
          input: '123 Main St - Empire Plaza',
          expected: 'Empire Plaza'
        },
        {
          input: 'Empire Plaza, 123 Main St',
          expected: 'Empire Plaza'
        },
        {
          input: '456 Broadway / Soho Tower',
          expected: 'Soho Tower'
        },
        {
          input: '789 Market St: Civic Center',
          expected: 'Civic Center'
        },
        {
          input: '555 Pine St | Financial Tower',
          expected: 'Financial Tower'
        },
        {
          input: 'Tech Hub @ 999 Market Street',
          expected: 'Tech Hub'
        },
        {
          input: 'One World Trade Center',
          expected: 'One World Trade Center'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = cleanBuildingName(input);
        expect(result).toBe(expected);
      });
    });

    test('should handle null and undefined inputs', () => {
      expect(cleanBuildingName(null)).toBeNull();
      expect(cleanBuildingName(undefined)).toBeUndefined();
      expect(cleanBuildingName('')).toBe('');
    });

    test('should handle single words', () => {
      expect(cleanBuildingName('Plaza')).toBe('Plaza');
    });

    test('should preserve building names without addresses', () => {
      const cleanNames = [
        'Federal Building',
        'City Hall',
        'Memorial Hospital',
        'University Center'
      ];

      cleanNames.forEach(name => {
        expect(cleanBuildingName(name)).toBe(name);
      });
    });

    test('should remove ZIP codes and suite numbers', () => {
      expect(cleanBuildingName('Empire Plaza, Suite 100')).toBe('Empire Plaza');
      expect(cleanBuildingName('Business Center, 12345')).toBe('Business Center');
    });
  });

  describe('hasAddressInName', () => {
    test('should detect addresses in building names', () => {
      const addressExamples = [
        '123 Main St - Building',
        '456 Broadway Building',
        '789 Oak Avenue Complex',
        '1000 First Street',
        '555 Park Place, Suite 200'
      ];

      addressExamples.forEach(name => {
        expect(hasAddressInName(name)).toBe(true);
      });
    });

    test('should not detect addresses in clean building names', () => {
      const cleanExamples = [
        'Federal Building',
        'City Hall',
        'Memorial Hospital',
        'University Center',
        'One World Trade Center'
      ];

      cleanExamples.forEach(name => {
        expect(hasAddressInName(name)).toBe(false);
      });
    });

    test('should handle null and undefined inputs', () => {
      expect(hasAddressInName(null)).toBe(false);
      expect(hasAddressInName(undefined)).toBe(false);
      expect(hasAddressInName('')).toBe(false);
    });

    test('should detect ZIP codes', () => {
      expect(hasAddressInName('Building Name, 12345')).toBe(true);
      expect(hasAddressInName('Office Complex, 12345-6789')).toBe(true);
    });

    test('should detect suite/floor/room numbers', () => {
      expect(hasAddressInName('Building Name, Suite 100')).toBe(true);
      expect(hasAddressInName('Office Complex, Floor 5')).toBe(true);
      expect(hasAddressInName('Center, Room 205')).toBe(true);
    });
  });

  describe('processRowData', () => {
    test('should process row data and add cleaned fields', () => {
      const mockRow = {
        'Real Property Asset Name': '123 Main St - Empire Plaza',
        'Street Address': '123 Main Street',
        'City': 'New York'
      };

      const result = processRowData(mockRow);

      expect(result).toHaveProperty('cleanedBuildingName');
      expect(result).toHaveProperty('addressInName');
      expect(result.cleanedBuildingName).toBe('Empire Plaza');
      expect(result.addressInName).toBe(true);
    });

    test('should preserve original data', () => {
      const mockRow = {
        'Real Property Asset Name': 'Federal Building',
        'Street Address': '100 Government Way',
        'City': 'Washington'
      };

      const result = processRowData(mockRow);

      expect(result['Real Property Asset Name']).toBe('Federal Building');
      expect(result['Street Address']).toBe('100 Government Way');
      expect(result['City']).toBe('Washington');
    });

    test('should handle empty Real Property Asset Name', () => {
      const mockRow = {
        'Real Property Asset Name': '',
        'Street Address': '123 Main St'
      };

      const result = processRowData(mockRow);

      expect(result.cleanedBuildingName).toBe('');
      expect(result.addressInName).toBe(false);
    });

    test('should handle missing Real Property Asset Name', () => {
      const mockRow = {
        'Street Address': '123 Main St'
      };

      const result = processRowData(mockRow);

      expect(result.cleanedBuildingName).toBe('');
      expect(result.addressInName).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle complex address patterns', () => {
      const complexCases = [
        {
          input: '123-125 Main Street - Shopping Complex',
          shouldHaveAddress: true,
          expectedClean: 'Shopping Complex'
        },
        {
          input: 'Building A @ 1000 Technology Drive',
          shouldHaveAddress: true,
          expectedClean: 'Building A'
        },
        {
          input: 'North Tower, 500 Business Park',
          shouldHaveAddress: true,
          expectedClean: 'North Tower'
        }
      ];

      complexCases.forEach(({ input, shouldHaveAddress, expectedClean }) => {
        expect(hasAddressInName(input)).toBe(shouldHaveAddress);
        expect(cleanBuildingName(input)).toBe(expectedClean);
      });
    });

    test('should handle whitespace and special characters', () => {
      expect(cleanBuildingName('  Empire Plaza  ')).toBe('Empire Plaza');
      expect(cleanBuildingName('Building-Name')).toBe('Building-Name');
      expect(cleanBuildingName('Building & Associates')).toBe('Building & Associates');
    });
  });
}); 