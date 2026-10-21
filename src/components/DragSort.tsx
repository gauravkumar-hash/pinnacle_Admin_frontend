import { createContext, useContext, useMemo, CSSProperties, HTMLAttributes, PropsWithChildren } from "react"
import { HolderOutlined } from "@ant-design/icons"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { DraggableSyntheticListeners } from "@dnd-kit/core"

interface RowContextProps {
  setActivatorNodeRef?: (element: HTMLElement | null) => void
  listeners?: DraggableSyntheticListeners
}

const RowContext = createContext<RowContextProps>({})

// Drag handle for use as a column render inside an antd <Table> row made sortable via SortableTableRow.
// Only this handle initiates the drag, so buttons/inputs elsewhere in the row stay clickable.
export function DragHandle() {
  const { setActivatorNodeRef, listeners } = useContext(RowContext)
  return (
    <HolderOutlined
      ref={setActivatorNodeRef}
      {...listeners}
      style={{ cursor: 'grab', color: '#999', touchAction: 'none' }}
    />
  )
}

interface SortableTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string
}

// Pass as components={{ body: { row: SortableTableRow } }} on an antd <Table> wrapped in
// <DndContext><SortableContext items={rowKeys}>...</SortableContext></DndContext>.
export function SortableTableRow(props: SortableTableRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props['data-row-key']
  })

  const style: CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999, background: '#fafafa' } : {})
  }

  const contextValue = useMemo<RowContextProps>(
    () => ({ setActivatorNodeRef, listeners }),
    [setActivatorNodeRef, listeners]
  )

  return (
    <RowContext.Provider value={contextValue}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes} />
    </RowContext.Provider>
  )
}

// Self-contained sortable row for simple lists (e.g. Form.List items) where the handle
// and its content live together rather than in separate table cells.
export function SortableListItem({ id, children }: PropsWithChildren<{ id: string }>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999, background: '#fafafa' } : {})
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-start gap-2 mb-2">
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        style={{ cursor: 'grab', color: '#999', touchAction: 'none', paddingTop: 8 }}
      >
        <HolderOutlined />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
