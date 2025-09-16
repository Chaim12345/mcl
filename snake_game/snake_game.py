import pygame
import random
import sys
Initialize pygame 
pygame.init() 
Constants 
WIDTH, HEIGHT = 600, 600
GRID_SIZE = 20
GRID_WIDTH = WIDTH // GRID_SIZE
GRID_HEIGHT = HEIGHT // GRID_SIZE
WHITE = (255, 255, 255)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
BLACK = (0, 0, 0)
SPEED = 10 
Set up the display 
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption('Snake Game')
clock = pygame.time.Clock() 
Snake class 
class Snake:
    def 
init
(self):
        self.positions = [(GRID_WIDTH // 2, GRID_HEIGHT // 2)]
        self.direction = (1, 0)
        self.grow_next = False 
def get_head_position(self):
    return self.positions[0]
    
def update(self):
    head = self.get_head_position()
    x, y = self.direction
    new_x = (head[0] + x) % GRID_WIDTH
    new_y = (head[1] + y) % GRID_HEIGHT
    
    # Game over if snake hits itself
    if (new_x, new_y) in self.positions[1:]:
        return False
        
    self.positions.insert(0, (new_x, new_y))
    
    if not self.grow_next:
        self.positions.pop()
    else:
        self.grow_next = False
        
    return True
    
def change_direction(self, direction):
    # Prevent 180-degree turns
    if (direction[0] * -1, direction[1] * -1) != self.direction:
        self.direction = direction
        
def draw(self, surface):
    for p in self.positions:
        r = pygame.Rect((p[0] * GRID_SIZE, p[1] * GRID_SIZE), 
                      (GRID_SIZE, GRID_SIZE))
        pygame.draw.rect(surface, GREEN, r)
        pygame.draw.rect(surface, BLACK, r, 1)
        
def grow(self):
    self.grow_next = True
Food class 
class Food:
    def 
init
(self):
        self.position = (0, 0)
        self.color = RED
        self.randomize_position() 
def randomize_position(self):
    self.position = (random.randint(0, GRID_WIDTH - 1), 
                    random.randint(0, GRID_HEIGHT - 1))
                    
def draw(self, surface):
    r = pygame.Rect((self.position[0] * GRID_SIZE, 
                    self.position[1] * GRID_SIZE), 
                   (GRID_SIZE, GRID_SIZE))
    pygame.draw.rect(surface, self.color, r)
    pygame.draw.rect(surface, BLACK, r, 1)
def draw_grid(surface):
    for y in range(0, HEIGHT, GRID_SIZE):
        for x in range(0, WIDTH, GRID_SIZE):
            rect = pygame.Rect(x, y, GRID_SIZE, GRID_SIZE)
            pygame.draw.rect(surface, BLACK, rect, 1) 
def main():
    # Create game objects
    snake = Snake()
    food = Food()
    score = 0 
# Font for score
font = pygame.font.SysFont(None, 30)
# Main game loop
running = True
game_over = False
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
            pygame.quit()
            sys.exit()
            
        if event.type == pygame.KEYDOWN:
            if game_over:
                if event.key == pygame.K_r:
                    # Restart game
                    snake = Snake()
                    food = Food()
                    score = 0
                    game_over = False
            else:
                if event.key == pygame.K_UP:
                    snake.change_direction((0, -1))
                if event.key == pygame.K_DOWN:
                    snake.change_direction((0, 1))
                if event.key == pygame.K_LEFT:
                    snake.change_direction((-1, 0))
                if event.key == pygame.K_RIGHT:
                    snake.change_direction((1, 0))
    
    if not game_over:
        # Update snake
        if not snake.update():
            game_over = True
            
        # Check if snake ate food
        if snake.get_head_position() == food.position:
            snake.grow()
            food.randomize_position()
            # Make sure food doesn't appear on snake
            while food.position in snake.positions:
                food.randomize_position()
            score += 1
            
    # Draw everything
    screen.fill(WHITE)
    draw_grid(screen)
    snake.draw(screen)
    food.draw(screen)
    
    # Draw score
    score_text = font.render(f'Score: {score}', True, BLACK)
    screen.blit(score_text, (10, 10))
    
    # Game over message
    if game_over:
        game_over_font = pygame.font.SysFont(None, 50)
        game_over_text = game_over_font.render('Game Over!', True, BLACK)
        restart_text = font.render('Press R to Restart', True, BLACK)
        screen.blit(game_over_text, 
                   (WIDTH // 2 - game_over_text.get_width() // 2, 
                    HEIGHT // 2 - game_over_text.get_height() // 2))
        screen.blit(restart_text, 
                   (WIDTH // 2 - restart_text.get_width() // 2, 
                    HEIGHT // 2 + 40))
    
    pygame.display.update()
    clock.tick(SPEED)
if 
name
 == "
main
":
    main()