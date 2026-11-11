import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import Button from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { Panel, PageHeader, Tag, Empty, Field, inputCls, useConfirm } from '../ui.jsx';

function CatalogueList({ kind, label }) {
  const qc = useQueryClient();
  const path = kind === 'category' ? 'categories' : 'brands';
  const { ask, dialog } = useConfirm();
  const [editing, setEditing] = useState(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', path],
    queryFn: () => api(`/admin/${path}`),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', path] });

  const remove = useMutation({
    mutationFn: (id) => api(`/admin/${path}/${id}`, { method: 'DELETE' }),
    onSuccess: (r) => {
      toast.success(
        r.deactivated ? `${label} hidden, because products use it` : `${label} deleted`
      );
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Panel
      title={`${label}s`}
      action={
        <Button size="sm" variant="secondary" onClick={() => setEditing({})}>
          Add {label.toLowerCase()}
        </Button>
      }
    >
      {isLoading ? (
        <p className="py-6 text-sm text-rose-50/60">Loading…</p>
      ) : data.length === 0 ? (
        <Empty>No {label.toLowerCase()}s yet.</Empty>
      ) : (
        <ul className="divide-y divide-ink-700">
          {data.map((c) => (
            <li
              key={c._id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-rose-50">{c.name}</span>
                <span className="text-xs text-rose-50/50">/{c.slug}</span>
                {c.isActive === false && <Tag tone="warn">hidden</Tag>}
              </div>
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  className="text-rose-200 underline underline-offset-4"
                  onClick={() => setEditing(c)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-rose-50/60 underline underline-offset-4 hover:text-danger"
                  onClick={() =>
                    ask(
                      `Remove ${c.name}? If products use it, it is hidden instead.`,
                      () => remove.mutate(c._id),
                      { yes: 'Remove' }
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <CatalogueForm
        kind={kind}
        label={label}
        value={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
      {dialog}
    </Panel>
  );
}

function CatalogueForm({ kind, label, value, onClose, onSaved }) {
  const path = kind === 'category' ? 'categories' : 'brands';
  const { register, handleSubmit, reset } = useForm({
    values: value?._id
      ? value
      : { name: '', slug: '', description: '', sortOrder: 0, isActive: true },
  });
  const mutation = useMutation({
    mutationFn: (v) =>
      value?._id
        ? api(`/admin/${path}/${value._id}`, { method: 'PUT', body: v })
        : api(`/admin/${path}`, { method: 'POST', body: v }),
    onSuccess: () => {
      toast.success(`${label} saved`);
      onSaved();
      reset();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });
  return (
    <Modal open={value !== null} onClose={onClose} label={`${label} details`}>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 p-6">
        <h2 className="text-lg">
          {value?._id ? `Edit ${label.toLowerCase()}` : `New ${label.toLowerCase()}`}
        </h2>
        <Field label="Name">
          <input className={inputCls} {...register('name', { required: true })} />
        </Field>
        <Field label="Slug (optional)">
          <input className={inputCls} {...register('slug')} />
        </Field>
        {kind === 'category' && (
          <>
            <Field label="Description">
              <input className={inputCls} {...register('description')} />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                className={inputCls}
                {...register('sortOrder', { valueAsNumber: true })}
              />
            </Field>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-rose-400" {...register('isActive')} />
          Visible on the store
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Catalogue() {
  return (
    <>
      <PageHeader title="Catalogue" subtitle="Categories and brands shoppers browse by." />
      <div className="grid gap-6 xl:grid-cols-2">
        <CatalogueList kind="category" label="Category" />
        <CatalogueList kind="brand" label="Brand" />
      </div>
    </>
  );
}
