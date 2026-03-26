'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface Props {
  bullets: string[]
  onChange: (bullets: string[]) => void
  maxBullets?: number
}

export default function BulletList({ bullets, onChange, maxBullets = 5 }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    const reordered = Array.from(bullets)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)
    onChange(reordered)
  }

  function updateBullet(index: number, value: string) {
    const next = [...bullets]
    next[index] = value
    onChange(next)
  }

  function deleteBullet(index: number) {
    onChange(bullets.filter((_, i) => i !== index))
  }

  function addBullet() {
    if (bullets.length >= maxBullets) return
    onChange([...bullets, ''])
    setEditingIndex(bullets.length)
  }

  return (
    <div className="space-y-2">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="bullets">
          {(provided) => (
            <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5">
              {bullets.map((bullet, index) => (
                <Draggable key={index} draggableId={String(index)} index={index}>
                  {(provided, snapshot) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-start gap-2 group ${snapshot.isDragging ? 'opacity-75' : ''}`}
                    >
                      {/* Drag handle */}
                      <span
                        {...provided.dragHandleProps}
                        className="mt-2 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing select-none"
                        title="Drag to reorder"
                      >
                        ⠿
                      </span>

                      {editingIndex === index ? (
                        <textarea
                          autoFocus
                          value={bullet}
                          onChange={(e) => updateBullet(index, e.target.value)}
                          onBlur={() => setEditingIndex(null)}
                          className="flex-1 text-sm border border-stone-400 dark:border-stone-600 rounded px-2 py-1 resize-none outline-none focus:ring-1 focus:ring-stone-400 min-h-[2.5rem] dark:bg-stone-800 dark:text-stone-100"
                          rows={2}
                        />
                      ) : (
                        <span
                          className="flex-1 text-sm text-gray-700 dark:text-gray-300 py-1 cursor-text"
                          onClick={() => setEditingIndex(index)}
                        >
                          {bullet || <span className="text-gray-400 italic">Empty bullet — click to edit</span>}
                        </span>
                      )}

                      <button
                        onClick={() => deleteBullet(index)}
                        className="mt-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity text-xs"
                        title="Delete bullet"
                      >
                        ✕
                      </button>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>

      {bullets.length < maxBullets && (
        <button
          onClick={addBullet}
          className="text-sm text-amber-700 hover:text-amber-900 font-medium"
        >
          + Add bullet
        </button>
      )}
    </div>
  )
}
