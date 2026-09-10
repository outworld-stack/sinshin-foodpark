// src/routes/admin/articles/edit.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { updateArticle } from '#/server/articles'
import { adminArticleDetailsOptions } from '#/utils/queryOptions'
import { qk } from '#/utils/queryKeys'
import { ArticleForm } from '#/components/admin/ArticleForm'
import { AdminArticleFormSkeleton } from '#/components/LoadingSkeletons'
import { useToastStore } from '#/stores/toastStore'
import type { ArticleFormData } from '#/types/forms'

export const Route = createFileRoute('/admin/articles/$articleId/edit')({
  component: EditArticlePage,
})

function EditArticlePage() {
  const { articleId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.showToast)

  const { data: article, isLoading } = useQuery(adminArticleDetailsOptions(articleId))

  // ورودی کاملاً تایپ‌دار (قبلاً data: any بود) —
  // subCategoryId با ?? null نرمال می‌شه چون اسکیمای سرور null می‌خواد
  const mutation = useMutation({
    mutationFn: (data: ArticleFormData) =>
      updateArticle({ data: { id: articleId, ...data, subCategoryId: data.subCategoryId ?? null } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.adminArticles })
      queryClient.invalidateQueries({ queryKey: qk.adminArticleDetails(articleId) })
      showToast('مقاله با موفقیت ویرایش شد')
      navigate({ to: '/admin/articles' })
    }
  })

  if (isLoading || !article) {
    return <AdminArticleFormSkeleton />
  }

  return (
    <div className="space-y-6">
      <h1 className="font-MorabbaBold text-3xl text-gray-800 dark:text-white">ویرایش مقاله: {article.title}</h1>
      <ArticleForm initialData={article} onSubmit={mutation.mutate} isSubmitting={mutation.isPending} />
    </div>
  )
}