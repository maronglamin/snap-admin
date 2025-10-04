import { usePermissions } from './usePermissions';

interface FeatureAccess {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export const useFeatureAccess = (entityType: string): FeatureAccess => {
  const { canView, canAdd, canEdit, canDelete, canExport } = usePermissions();

  return {
    canView: canView(entityType),
    canAdd: canAdd(entityType),
    canEdit: canEdit(entityType),
    canDelete: canDelete(entityType),
    canExport: canExport(entityType),
  };
}; 