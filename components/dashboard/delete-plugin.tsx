"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deletePlugin } from "@/app/actions/plugins"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function DeletePlugin({ pluginId, name }: { pluginId: string; name: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      const result = await deletePlugin(pluginId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`${name} removed`)
      router.push("/dashboard/plugins")
      router.refresh()
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isPending}>
          Remove plugin
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {name} from the dashboard?</AlertDialogTitle>
          <AlertDialogDescription>
            Its download history, release log and listing draft are deleted here and cannot be recovered. Nothing changes
            on the marketplaces.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={remove}>
            Remove plugin
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
