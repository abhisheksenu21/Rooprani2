import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Edit3,
  FolderPlus,
  Loader2,
  Trash2,
} from 'lucide-react';
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog';
import { useAdminCatalogue } from '../../context/AdminCatalogueContext';
import { useAuth } from '../../context/AuthContext';
import { useDocumentMetadata } from '../../hooks/useDocumentMetadata';
import {
  AdminAuthExpiredError,
  createAdminCategory,
  deleteAdminCategory,
  reassignAdminCategoryProducts,
  renameAdminCategory,
} from '../../services/adminApi';
import type { Category } from '../../types/catalogue';

export function AdminCategoriesPage() {
  const { categories, loading, syncAfterMutation } = useAdminCatalogue();
  const { getIdToken, signOutUser } = useAuth();
  const navigate = useNavigate();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Empty category deletion confirmation
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null);

  // Non-empty category reassignment helper
  const [categoryBlockedDelete, setCategoryBlockedDelete] = useState<Category | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');
  const [reassigning, setReassigning] = useState(false);

  useDocumentMetadata({
    title: 'Categories — Rooprani Admin',
    description: 'Manage Rooprani jewellery categories and view assigned product counts.',
  });

  const handleAuthError = async (err: unknown) => {
    if (err instanceof AdminAuthExpiredError) {
      await signOutUser();
      navigate('/account', { replace: true });
      return true;
    }
    return false;
  };

  const handleCreateCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (creating) return;

    const trimmed = newCategoryName.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 2) {
      setActionError('Category name must be at least 2 characters.');
      return;
    }

    setCreating(true);
    setActionError(null);
    try {
      const created = await createAdminCategory(getIdToken, trimmed);
      setNewCategoryName('');
      await syncAfterMutation(`Category "${created.name}" created.`);
    } catch (err) {
      if (await handleAuthError(err)) return;
      setActionError(err instanceof Error ? err.message : 'Unable to create category.');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveRename = async (categoryId: string) => {
    if (renaming) return;
    const trimmed = editingName.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 2) {
      setActionError('Category name must be at least 2 characters.');
      return;
    }

    setRenaming(true);
    setActionError(null);
    try {
      const updated = await renameAdminCategory(getIdToken, Number(categoryId), trimmed);
      setEditingId(null);
      setEditingName('');
      await syncAfterMutation(`Category renamed to "${updated.name}".`);
    } catch (err) {
      if (await handleAuthError(err)) return;
      setActionError(err instanceof Error ? err.message : 'Unable to rename category.');
    } finally {
      setRenaming(false);
    }
  };

  const handleInitiateDelete = (category: Category) => {
    setActionError(null);
    const count = category.product_count ?? 0;
    if (count > 0) {
      const otherCategories = categories.filter((c) => c.id !== category.id);
      setReassignTargetId(otherCategories[0]?.id ?? '');
      setCategoryBlockedDelete(category);
    } else {
      setDeleteDialogError(null);
      setCategoryToDelete(category);
    }
  };

  const handleConfirmEmptyDelete = async () => {
    if (!categoryToDelete || deleting) return;
    setDeleting(true);
    setDeleteDialogError(null);
    try {
      await deleteAdminCategory(getIdToken, Number(categoryToDelete.id));
      const deletedName = categoryToDelete.name;
      setCategoryToDelete(null);
      await syncAfterMutation(`Category "${deletedName}" deleted.`);
    } catch (err) {
      if (await handleAuthError(err)) return;
      setDeleteDialogError(err instanceof Error ? err.message : 'Unable to delete category.');
    } finally {
      setDeleting(false);
    }
  };

  const handleReassignAndDelete = async (event: FormEvent) => {
    event.preventDefault();
    if (!categoryBlockedDelete || !reassignTargetId || reassigning) return;

    setReassigning(true);
    setActionError(null);
    try {
      const fromId = Number(categoryBlockedDelete.id);
      const toId = Number(reassignTargetId);
      await reassignAdminCategoryProducts(getIdToken, fromId, toId);
      await deleteAdminCategory(getIdToken, fromId);
      const removedName = categoryBlockedDelete.name;
      setCategoryBlockedDelete(null);
      await syncAfterMutation(
        `Reassigned products and removed category "${removedName}".`
      );
    } catch (err) {
      if (await handleAuthError(err)) return;
      setActionError(
        err instanceof Error ? err.message : 'Unable to reassign products and delete category.'
      );
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs tracking-[0.2em] uppercase text-[#8C6B3C] font-medium">
          Taxonomy
        </p>
        <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-normal text-[#221A15]">
          Categories
        </h1>
        <p className="text-sm text-[#6B5E53] mt-1">
          Categories power the Add Product selector and the public storefront filters.
        </p>
      </div>

      {actionError && (
        <div
          role="alert"
          className="border border-[#E5B8B2] bg-[#FDF2F0] px-4 py-3 text-sm text-[#8C2318] flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#9F2D20]" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Blocked Deletion Warning & Safe Reassignment Box */}
      {categoryBlockedDelete && (
        <form
          onSubmit={handleReassignAndDelete}
          className="border border-[#D6BE96] bg-[#FBF7EE] p-6 space-y-4"
        >
          <div className="space-y-1">
            <p className="text-xs tracking-[0.16em] uppercase font-medium text-[#8C6B3C]">
              Category Has Assigned Products
            </p>
            <h2 className="font-serif text-2xl text-[#221A15]">
              Cannot delete &ldquo;{categoryBlockedDelete.name}&rdquo; directly
            </h2>
            <p className="text-sm text-[#4A3F36] leading-relaxed">
              There{' '}
              {(categoryBlockedDelete.product_count ?? 0) === 1
                ? 'is 1 product'
                : `are ${categoryBlockedDelete.product_count ?? 0} products`}{' '}
              currently assigned to <strong>{categoryBlockedDelete.name}</strong>. To prevent
              orphaned catalogue items, reassign those products to another category below before
              deleting this category.
            </p>
          </div>

          {categories.length > 1 ? (
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-2">
              <div className="flex-1 max-w-sm">
                <label
                  htmlFor="reassign-target-select"
                  className="block text-xs tracking-[0.14em] uppercase text-[#4A3F36] mb-1.5"
                >
                  Move assigned products to
                </label>
                <select
                  id="reassign-target-select"
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                  className="w-full min-h-[42px] bg-[#FFFDFA] border border-[#D5C9B8] px-3.5 py-2 text-sm text-[#221A15] focus:border-[#8C6B3C] focus:outline-none"
                >
                  {categories
                    .filter((c) => c.id !== categoryBlockedDelete.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={reassigning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] bg-[#231B16] text-[#F6F1E9] text-xs tracking-[0.14em] uppercase font-medium hover:bg-[#3A2D25] transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {reassigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Reassigning...</span>
                    </>
                  ) : (
                    <span>Reassign &amp; Delete Category</span>
                  )}
                </button>

                <button
                  type="button"
                  disabled={reassigning}
                  onClick={() => setCategoryBlockedDelete(null)}
                  className="px-4 py-2.5 min-h-[42px] border border-[#D5C9B8] text-xs tracking-[0.14em] uppercase text-[#4A3F36] hover:text-[#221A15] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setCategoryBlockedDelete(null)}
                className="px-4 py-2 border border-[#D5C9B8] text-xs uppercase tracking-[0.14em] text-[#221A15] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Add Category Form */}
        <form
          onSubmit={handleCreateCategory}
          className="lg:col-span-4 bg-[#FFFDFA] border border-[#E2D8C8] p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-xs tracking-[0.16em] uppercase text-[#8C6B3C] font-medium">
            <FolderPlus className="w-4 h-4 stroke-[1.6]" aria-hidden="true" />
            <span>Add Category</span>
          </div>

          <div>
            <label
              htmlFor="admin-new-category"
              className="block text-xs tracking-[0.14em] uppercase text-[#4A3F36] mb-2"
            >
              Category Name *
            </label>
            <input
              id="admin-new-category"
              type="text"
              required
              disabled={creating}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Bridal Sets"
              className="w-full min-h-[44px] bg-[#FAF6F0] border border-[#D5C9B8] px-3.5 py-2 text-sm text-[#221A15] placeholder:text-[#96897B] focus:border-[#8C6B3C] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={creating || newCategoryName.trim().length < 2}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 bg-[#231B16] text-[#F6F1E9] text-xs tracking-[0.16em] uppercase font-medium hover:bg-[#3A2D25] transition-colors disabled:opacity-45 cursor-pointer"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden="true" />
                <span>Adding...</span>
              </>
            ) : (
              <span>Add Category</span>
            )}
          </button>
        </form>

        {/* Categories Table */}
        <div className="lg:col-span-8 bg-[#FFFDFA] border border-[#E2D8C8] overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-[#6B5E53]">Loading categories...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2D8C8] bg-[#FAF6F0] text-[11px] tracking-[0.15em] uppercase text-[#6B5E53]">
                  <th className="py-3.5 px-5 font-medium">Category Name</th>
                  <th className="py-3.5 px-4 font-medium">Slug</th>
                  <th className="py-3.5 px-4 font-medium text-right">Products</th>
                  <th className="py-3.5 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1D3] text-sm">
                {categories.map((cat) => {
                  const isEditing = editingId === cat.id;
                  const count = cat.product_count ?? 0;

                  return (
                    <tr key={cat.id} className="hover:bg-[#FAF6F0]/70 transition-colors">
                      <td className="py-3.5 px-5">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              aria-label="Edit category name"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="min-h-[38px] bg-[#FAF6F0] border border-[#8C6B3C] px-3 py-1.5 text-sm text-[#221A15] focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={renaming}
                              onClick={() => void handleSaveRename(cat.id)}
                              className="px-3 py-1.5 min-h-[38px] bg-[#231B16] text-[#F6F1E9] text-xs uppercase tracking-[0.12em] cursor-pointer"
                            >
                              {renaming ? '...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              disabled={renaming}
                              onClick={() => {
                                setEditingId(null);
                                setEditingName('');
                              }}
                              className="px-3 py-1.5 min-h-[38px] border border-[#D5C9B8] text-xs uppercase text-[#5A4E44] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="font-medium text-[#221A15]">{cat.name}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[#6B5E53]">/{cat.slug}</td>

                      <td className="py-3.5 px-4 text-right font-medium text-[#221A15] tabular-nums">
                        {count}
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {!isEditing && (
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditingName(cat.name);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] border border-[#D5C9B8] text-xs tracking-[0.12em] uppercase text-[#221A15] hover:border-[#221A15] transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Rename</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleInitiateDelete(cat)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] border border-[#E5B8B2] text-xs tracking-[0.12em] uppercase text-[#9F2D20] hover:bg-[#FDF2F0] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AdminConfirmDialog
        open={Boolean(categoryToDelete)}
        title="Delete Category"
        description={
          categoryToDelete
            ? `Are you sure you want to delete the empty category "${categoryToDelete.name}"?`
            : ''
        }
        confirmLabel="Delete Category"
        loading={deleting}
        error={deleteDialogError}
        onConfirm={() => void handleConfirmEmptyDelete()}
        onCancel={() => {
          if (!deleting) {
            setCategoryToDelete(null);
            setDeleteDialogError(null);
          }
        }}
      />
    </div>
  );
}
