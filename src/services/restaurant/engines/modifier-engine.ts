/**
 * ModifierEngine — Product modifier / add-on logic.
 *
 * Handles:
 *   - Optional add-ons (extra cheese, bacon, etc.)
 *   - Required choices (size, temperature)
 *   - Modifier groups with min/max selection rules
 *   - Price adjustments per modifier
 */

// ── Types ──

export interface ModifierGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  required: boolean;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  priceAdjustmentCents: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  modifierId: string;
  modifierName: string;
  priceAdjustmentCents: number;
}

export interface ModifierValidation {
  valid: boolean;
  errors: string[];
  totalAdjustmentCents: number;
}

// ── Engine ──

export class ModifierEngine {
  /**
   * Calculate the total price adjustment from selected modifiers.
   */
  calculateAdjustment(selected: SelectedModifier[]): number {
    return selected.reduce((sum, m) => sum + m.priceAdjustmentCents, 0);
  }

  /**
   * Calculate the effective unit price including modifiers.
   */
  calculateEffectivePrice(basePriceCents: number, selected: SelectedModifier[]): number {
    return basePriceCents + this.calculateAdjustment(selected);
  }

  /**
   * Validate that the selected modifiers satisfy the group rules.
   *
   * @param groups   The available modifier groups.
   * @param selected The user's selected modifiers.
   * @returns Validation result with errors if any.
   */
  validateSelection(
    groups: ModifierGroup[],
    selected: SelectedModifier[],
  ): ModifierValidation {
    const errors: string[] = [];
    const selectedByGroup = new Map<string, SelectedModifier[]>();

    for (const sel of selected) {
      const list = selectedByGroup.get(sel.groupId) ?? [];
      list.push(sel);
      selectedByGroup.set(sel.groupId, list);
    }

    for (const group of groups) {
      const groupSelections = selectedByGroup.get(group.id) ?? [];
      const count = groupSelections.length;

      if (group.required && count < group.minSelection) {
        errors.push(
          `'${group.name}' requires at least ${group.minSelection} selection(s)`,
        );
      }

      if (count > group.maxSelection) {
        errors.push(
          `'${group.name}' allows at most ${group.maxSelection} selection(s)`,
        );
      }
    }

    const totalAdjustmentCents = this.calculateAdjustment(selected);

    return {
      valid: errors.length === 0,
      errors,
      totalAdjustmentCents,
    };
  }

  /**
   * Get the default selections for a set of modifier groups.
   */
  getDefaults(groups: ModifierGroup[]): SelectedModifier[] {
    const defaults: SelectedModifier[] = [];

    for (const group of groups) {
      for (const modifier of group.modifiers) {
        if (modifier.isDefault && modifier.isActive) {
          defaults.push({
            groupId: group.id,
            groupName: group.name,
            modifierId: modifier.id,
            modifierName: modifier.name,
            priceAdjustmentCents: modifier.priceAdjustmentCents,
          });
        }
      }
    }

    return defaults;
  }

  /**
   * Find a modifier by ID within groups.
   */
  findModifier(groups: ModifierGroup[], modifierId: string): Modifier | null {
    for (const group of groups) {
      const found = group.modifiers.find((m) => m.id === modifierId);
      if (found) return found;
    }
    return null;
  }
}
