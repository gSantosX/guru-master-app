import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_code_image(code):
    try:
        img_path = os.path.join(BASE_DIR, 'email_template.jpg')
        if not os.path.exists(img_path):
            print("Template not found at", img_path)
            return None
            
        img = Image.open(img_path)
        draw = ImageDraw.Draw(img)
        width, height = img.size
        pixels = img.load()
        
        box_y = -1
        box_x_start = -1
        box_x_end = -1
        
        for y in range(height // 2, height):
            white_count = 0
            for x in range(width):
                r, g, b = pixels[x, y][:3]
                if r > 220 and g > 220 and b > 220:
                    white_count += 1
                else:
                    if white_count > width * 0.4:
                        box_y = y
                        for xs in range(width):
                            if pixels[xs, y][0] > 220:
                                box_x_start = xs
                                break
                        for xe in range(width-1, 0, -1):
                            if pixels[xe, y][0] > 220:
                                box_x_end = xe
                                break
                        break
                    white_count = 0
            if box_y != -1: break
            
        print(f"Detected Box: y={box_y}, x_start={box_x_start}, x_end={box_x_end}")
        
        if box_y == -1: 
             box_y, box_x_start, box_x_end = 530, 160, 560
             
        try:
            # Use a common font path on Windows or default
            font = ImageFont.truetype("arial.ttf", 60)
        except:
            font = ImageFont.load_default()
            
        text = str(code)
        center_x = box_x_start + (box_x_end - box_x_start) // 2
        draw.text((center_x - 70, box_y + 10), text, fill=(0, 0, 0), font=font)
        
        out_path = os.path.join(BASE_DIR, 'test_output.jpg')
        img.save(out_path, quality=95)
        print("Saved to", out_path)
        return out_path
    except Exception as e:
        print(f"PIL Error: {e}")
        return None

if __name__ == '__main__':
    get_code_image("1234")
