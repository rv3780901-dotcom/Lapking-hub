
'use client';

import React from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { Banner } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const bannerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  imageUrl: z.string().url('Must be a valid URL'),
  ctaLabel: z.string().optional(),
  ctaLink: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

type BannerFormData = z.infer<typeof bannerSchema>;

function BannerForm({
  banner,
  onFinished,
}: {
  banner?: Banner;
  onFinished: () => void;
}) {
  const firestore = useFirestore();
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<BannerFormData>({
    resolver: zodResolver(bannerSchema),
    defaultValues: banner || {
      title: '',
      subtitle: '',
      imageUrl: '',
      ctaLabel: '',
      ctaLink: '',
      isActive: true,
      sortOrder: 0,
    },
  });

  React.useEffect(() => {
    reset(banner);
  }, [banner, reset]);

  const onSubmit = async (data: BannerFormData) => {
    if (!firestore) return;
    setLoading(true);
    try {
      if (banner) {
        const bannerRef = doc(firestore, 'banners', banner.id);
        await updateDoc(bannerRef, { ...data, updatedAt: serverTimestamp() });
        toast({ title: 'Banner updated successfully' });
      } else {
        await addDoc(collection(firestore, 'banners'), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Banner added successfully' });
      }
      onFinished();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving banner',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>
      <div>
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input id="subtitle" {...register('subtitle')} />
      </div>
      <div>
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input id="imageUrl" {...register('imageUrl')} />
        {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
      </div>
       <div>
        <Label htmlFor="ctaLabel">CTA Label (e.g. Shop Now)</Label>
        <Input id="ctaLabel" {...register('ctaLabel')} />
      </div>
       <div>
        <Label htmlFor="ctaLink">CTA Link (e.g. /category/laptops)</Label>
        <Input id="ctaLink" {...register('ctaLink')} />
      </div>
       <div>
        <Label htmlFor="sortOrder">Sort Order</Label>
        <Input id="sortOrder" type="number" {...register('sortOrder')} />
      </div>
      <div className="flex items-center space-x-2">
        <Controller name="isActive" control={control} render={({ field }) => <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />} />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {banner ? 'Update Banner' : 'Create Banner'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function BannerRow({ banner }: { banner: Banner }) {
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);

  const handleDelete = async () => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'banners', banner.id));
      toast({ title: 'Banner deleted' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting banner',
        description: error.message,
      });
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{banner.title}</TableCell>
      <TableCell>{banner.sortOrder}</TableCell>
      <TableCell>
         <Badge variant={banner.isActive ? 'default' : 'secondary'}>{banner.isActive ? 'Active' : 'Inactive'}</Badge>
      </TableCell>
      <TableCell>{banner.updatedAt?.toDate().toLocaleDateString()}</TableCell>
      <TableCell className="text-right">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Banner</DialogTitle>
            </DialogHeader>
            <BannerForm banner={banner} onFinished={() => setOpen(false)} />
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the banner.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export default function BannersPage() {
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);

  const bannersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'banners'), orderBy('sortOrder'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: banners, isLoading } = useCollection<Banner>(bannersQuery);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Home Slider Banners</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Banner</DialogTitle>
            </DialogHeader>
            <BannerForm onFinished={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {banners?.map((banner) => (
              <BannerRow key={banner.id} banner={banner} />
            ))}
             {!isLoading && banners?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">
                        No banners found.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
