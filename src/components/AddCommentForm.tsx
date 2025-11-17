'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { Send, User } from 'lucide-react'

interface CommentForm {
  comment: string
}

interface AddCommentFormProps {
  alertId: string
  onCommentAdded: () => void
}

export default function AddCommentForm({ alertId, onCommentAdded }: AddCommentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CommentForm>()

  const onSubmit = async (data: CommentForm) => {
    setLoading(true)
    setError('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to add comments')
        return
      }

      // Insert new comment
      const { error: insertError } = await supabase
        .from('alert_comments')
        .insert([
          {
            alert_id: alertId,
            user_id: user.id,
            comment: data.comment.trim()
          }
        ])

      if (insertError) {
        console.error('Comment insert error:', insertError)
        throw insertError
      }

      // Reset form and refresh
      reset()
      onCommentAdded()

      // Log the action
      await supabase
        .from('user_logs')
        .insert([
          {
            user_id: user.id,
            action: 'add_comment',
            ip_address: '',
            user_agent: navigator.userAgent
          }
        ])

    } catch (error: any) {
      console.error('Comment submission error:', error)
      setError(error.message || 'Failed to add comment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-300 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-accent-gold rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-black" />
            </div>
          </div>
          
          <div className="flex-1">
            <textarea
              {...register('comment', { 
                required: 'Comment is required',
                minLength: {
                  value: 2,
                  message: 'Comment must be at least 2 characters'
                },
                maxLength: {
                  value: 500,
                  message: 'Comment must be less than 500 characters'
                }
              })}
              placeholder="Add an update or information..."
              className="w-full px-3 py-2 bg-dark-gray border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-gold resize-none"
              rows={3}
            />
            {errors.comment && (
              <p className="text-accent-red text-sm mt-1">{errors.comment.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary inline-flex items-center space-x-2 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{loading ? 'Posting...' : 'Post Comment'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
